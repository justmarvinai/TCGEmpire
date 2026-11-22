-- alpha_08 (Freunde), part 2: Pack Battles (docs/GAME_DESIGN.md §16.3). A lobby for 2–4 seats; every seat pays the
-- same stake (Marktwert of the boosters). At the start empty seats get NPC bots and the server opens every pack at
-- once; clients replay round by round against the server clock and never see a round before its time. When the last
-- round is shown, the cards go to the winner(s) by the mode's rule. Bots pay nothing; what a bot wins leaves the
-- world. Emotes, spectators and a battle channel for live updates.

create table game.battles (
  id bigint generated always as identity primary key,
  host_id uuid references game.players (id) on delete cascade,
  mode text not null check (mode in ('klassisch', 'krepel', 'top', 'jackpot', 'team', 'freundschaft')),
  product_id text not null references game.product_defs (id),
  packs int not null check (packs between 1 and 10),
  seats int not null check (seats between 2 and 4),
  stake_cents bigint not null,
  state text not null default 'open' check (state in ('open', 'running', 'done', 'cancelled')),
  created_at timestamptz not null,
  started_at timestamptz,
  round_seconds int,
  ends_at timestamptz,
  -- per mode: winning seats and totals, decided at the start, shown at the end
  result jsonb,
  check (mode <> 'team' or seats = 4)
);
create index battles_host on game.battles (host_id);
create index battles_product on game.battles (product_id);
create index battles_state on game.battles (state, ends_at);

create table game.battle_seats (
  battle_id bigint not null references game.battles (id) on delete cascade,
  seat int not null,
  player_id uuid references game.players (id) on delete set null,
  npc_id text references game.npcs (id),
  paid_cents bigint not null default 0,
  total_cents bigint,
  primary key (battle_id, seat)
);
create index battle_seats_player on game.battle_seats (player_id);
create index battle_seats_npc on game.battle_seats (npc_id);

create table game.battle_pulls (
  battle_id bigint not null references game.battles (id) on delete cascade,
  seat int not null,
  round int not null,
  idx int not null,
  card_id text not null references game.card_defs (id),
  value_cents bigint not null,
  -- quality values of a hit, rolled with the pack
  q smallint[],
  primary key (battle_id, seat, round, idx)
);
create index battle_pulls_card on game.battle_pulls (card_id);

create table game.battle_emotes (
  id bigint generated always as identity primary key,
  battle_id bigint not null references game.battles (id) on delete cascade,
  player_id uuid not null references game.players (id) on delete cascade,
  emote text not null,
  at timestamptz not null
);
create index battle_emotes_battle on game.battle_emotes (battle_id, id);
create index battle_emotes_player on game.battle_emotes (player_id);

alter table game.battles enable row level security;
alter table game.battle_seats enable row level security;
alter table game.battle_pulls enable row level security;
alter table game.battle_emotes enable row level security;

-- Live: the battle's own channel, and the lobby on the world channel.
create function private.on_battle_rt() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_id bigint := coalesce(v_row ->> 'battle_id', v_row ->> 'id')::bigint;
begin
  perform private.rt_send('battle:' || v_id, 'poke', jsonb_build_object('area', 'battle'));
  if tg_table_name <> 'battle_emotes' then
    perform private.rt_send('world', 'poke', jsonb_build_object('area', 'battles'));
  end if;
  return null;
end $$;
create trigger battles_rt after insert or update on game.battles for each row execute function private.on_battle_rt();
create trigger battle_seats_rt after insert or update or delete on game.battle_seats for each row execute function private.on_battle_rt();
create trigger battle_emotes_rt after insert on game.battle_emotes for each row execute function private.on_battle_rt();

-- ---------------------------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------------------------
-- Rounds shown so far (0 before the start, packs at the end).
create function private.battle_round(b game.battles) returns int
language sql stable set search_path = '' as $$
  select case
    when b.started_at is null or private.now() < b.started_at then 0
    else least(b.packs, floor(extract(epoch from private.now() - b.started_at) / b.round_seconds)::int + 1)
  end
$$;

create function private.battle_seats_doc(b game.battles, p_round int) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'seat', s.seat,
    'player_id', s.player_id,
    'name', coalesce(p.username, n.name),
    'bot', s.npc_id is not null,
    'look', case when p.id is not null then private.look(p) end,
    'shown_cents', (select coalesce(sum(value_cents), 0) from game.battle_pulls where battle_id = b.id and seat = s.seat and round <= p_round)
  ) order by s.seat), '[]'::jsonb)
  from game.battle_seats s
  left join game.players p on p.id = s.player_id
  left join game.npcs n on n.id = s.npc_id
  where s.battle_id = b.id
$$;

create function private.battle_summary(b game.battles, p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', b.id, 'mode', b.mode, 'product_id', b.product_id, 'packs', b.packs, 'seats', b.seats,
    'stake_cents', b.stake_cents, 'state', b.state, 'host_id', b.host_id,
    'started_at', b.started_at, 'ends_at', b.ends_at, 'round_seconds', b.round_seconds,
    'mine', exists (select 1 from game.battle_seats where battle_id = b.id and player_id = p_player),
    'players', private.battle_seats_doc(b, private.battle_round(b))
  )
$$;

-- One battle as a spectator sees it right now: only rounds whose time has come, the result at the end.
create function private.battle_doc(b game.battles, p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select private.battle_summary(b, p_player) || jsonb_build_object(
    'round', private.battle_round(b),
    'server_now', private.now(),
    'pulls', coalesce((
      select jsonb_agg(jsonb_build_object('seat', seat, 'round', round, 'card_id', card_id, 'value_cents', value_cents)
        order by round, seat, value_cents desc, idx)
      from game.battle_pulls where battle_id = b.id and round <= private.battle_round(b)
    ), '[]'::jsonb),
    'result', case when b.state = 'done' then b.result end,
    'emotes', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'name', p.username, 'emote', e.emote, 'at', e.at) order by e.id)
      from (select * from game.battle_emotes where battle_id = b.id order by id desc limit 30) e
      join game.players p on p.id = e.player_id
    ), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------------------------------
-- Engine
-- ---------------------------------------------------------------------------------------------
-- Opens every pack, decides the winner by the mode and fixes the timeline.
create function private.battle_begin(p_battle bigint) returns void
language plpgsql set search_path = '' as $$
declare
  b game.battles;
  s record;
  v_cards text[];
  v_card text;
  i int;
  r int;
  v_tier text;
  v_win int[];
  v_totals jsonb;
  v_pick numeric;
  v_sum numeric;
begin
  select * into b from game.battles where id = p_battle for update;
  -- empty seats get bots, each a different NPC
  insert into game.battle_seats (battle_id, seat, npc_id)
  select b.id, f.seat, n.id
  from (select g as seat, row_number() over (order by g) as k from generate_series(1, b.seats) g
        where not exists (select 1 from game.battle_seats where battle_id = b.id and seat = g)) f
  join (select id, row_number() over (order by private.rand()) as k from game.npcs) n on n.k = f.k;

  for s in select * from game.battle_seats where battle_id = b.id order by seat loop
    for r in 1 .. b.packs loop
      -- same odds for every seat: no personal pack luck, no Pech-Schutz
      v_cards := private.roll_pack(null, b.product_id);
      i := 0;
      foreach v_card in array v_cards loop
        i := i + 1;
        select tier into v_tier from game.card_defs where id = v_card;
        insert into game.battle_pulls (battle_id, seat, round, idx, card_id, value_cents, q)
        values (b.id, s.seat, r, i, v_card, private.card_value(v_card),
                case when v_tier in ('holo', 'alternative', 'ultra', 'grail')
                     then array[private.roll_quality(), private.roll_quality(), private.roll_quality(), private.roll_quality()] end);
      end loop;
    end loop;
    if s.player_id is not null then
      perform private.ep_grant(s.player_id, b.packs * private.cfg_num('ep.pack'));
      perform private.emit(s.player_id, 'pack_opened', b.packs);
      perform private.emit(s.player_id, 'battle_played');
    end if;
  end loop;
  update game.battle_seats bs set total_cents = (select sum(value_cents) from game.battle_pulls p where p.battle_id = b.id and p.seat = bs.seat)
  where bs.battle_id = b.id;

  select jsonb_object_agg(seat::text, total_cents) into v_totals from game.battle_seats where battle_id = b.id;
  if b.mode = 'klassisch' then
    select array[seat] into v_win from game.battle_seats where battle_id = b.id order by total_cents desc, private.rand() limit 1;
  elsif b.mode = 'krepel' then
    select array[seat] into v_win from game.battle_seats where battle_id = b.id order by total_cents, private.rand() limit 1;
  elsif b.mode = 'top' then
    select array[seat] into v_win from game.battle_pulls where battle_id = b.id order by value_cents desc, private.rand() limit 1;
  elsif b.mode = 'jackpot' then
    v_sum := (select sum(total_cents) from game.battle_seats where battle_id = b.id);
    v_pick := private.rand() * v_sum;
    for s in select * from game.battle_seats where battle_id = b.id order by seat loop
      v_pick := v_pick - s.total_cents;
      if v_pick < 0 or v_win is null and s.seat = b.seats then
        v_win := array[s.seat];
        exit;
      end if;
    end loop;
  elsif b.mode = 'team' then
    -- seats 1 and 3 against 2 and 4; a draw is decided by coin
    v_sum := (select sum(total_cents) filter (where seat in (1, 3)) - sum(total_cents) filter (where seat in (2, 4))
              from game.battle_seats where battle_id = b.id);
    v_win := case when v_sum > 0 or v_sum = 0 and private.rand() < 0.5 then array[1, 3] else array[2, 4] end;
  else
    v_win := null;  -- Freundschaftsspiel: everyone keeps their own
  end if;

  update game.battles set
    state = 'running',
    started_at = private.now() + make_interval(secs => private.cfg_num('battle.lead_seconds')),
    round_seconds = private.cfg_num('battle.round_seconds')::int,
    ends_at = private.now() + make_interval(secs => private.cfg_num('battle.lead_seconds') + b.packs * private.cfg_num('battle.round_seconds')),
    result = jsonb_build_object('winners', to_jsonb(coalesce(v_win, '{}'::int[])), 'totals', v_totals)
  where id = b.id;
end $$;

-- Who gets the cards of a seat: the winner (team: the opponent seat's partner), or the seat itself.
create function private.battle_receiver(b game.battles, p_seat int) returns int
language sql immutable set search_path = '' as $$
  select case
    when b.mode = 'freundschaft' then p_seat
    when b.mode = 'team' then case when p_seat = any (array(select jsonb_array_elements_text(b.result -> 'winners')::int)) then p_seat
                                   else (case p_seat when 1 then 2 when 2 then 1 when 3 then 4 else 3 end) end
    else (b.result -> 'winners' ->> 0)::int
  end
$$;

-- After the last round: cards to their new owners, notifications, a headline for big pots.
create function private.battle_settle(p_battle bigint) returns void
language plpgsql set search_path = '' as $$
declare
  b game.battles;
  r record;
  v_to uuid;
  v_pot bigint;
begin
  select * into b from game.battles where id = p_battle and state = 'running' and ends_at <= private.now() for update skip locked;
  if not found then
    return;
  end if;
  for r in select p.*, s.player_id as opener, d.tier from game.battle_pulls p
           join game.battle_seats s on s.battle_id = p.battle_id and s.seat = p.seat
           join game.card_defs d on d.id = p.card_id
           where p.battle_id = b.id order by p.seat, p.round, p.idx loop
    select player_id into v_to from game.battle_seats where battle_id = b.id and seat = private.battle_receiver(b, r.seat);
    if v_to is not null then
      if r.q is not null then
        insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
        values (v_to, r.card_id, r.q[1], r.q[2], r.q[3], r.q[4], private.now());
      else
        perform private.stack_add(v_to, r.card_id, 1);
      end if;
      insert into game.collection (player_id, card_id, first_at) values (v_to, r.card_id, private.now()) on conflict do nothing;
      if found then
        perform private.ep_grant(v_to, private.cfg_num('ep.new_card'));
        perform private.emit(v_to, 'card_new');
      end if;
    end if;
    if r.opener is not null then
      update game.players set best_pull_card = r.card_id, best_pull_cents = r.value_cents
      where id = r.opener and best_pull_cents < r.value_cents;
      if r.tier in ('ultra', 'grail') then
        perform private.emit(r.opener, 'pulled_' || r.tier);
        perform private.feed_add('pull_' || r.tier, jsonb_build_object('name', (select username from game.players where id = r.opener), 'card_id', r.card_id));
      end if;
    end if;
  end loop;
  update game.battles set state = 'done' where id = b.id;
  v_pot := (select sum(total_cents) from game.battle_seats where battle_id = b.id);
  for r in select s.player_id, s.seat from game.battle_seats s where s.battle_id = b.id and s.player_id is not null loop
    perform private.notify(r.player_id, 'battle_done', jsonb_build_object('battle', b.id, 'mode', b.mode,
      'won', b.mode <> 'freundschaft' and (b.result -> 'winners') @> to_jsonb(r.seat), 'pot', v_pot));
    if b.mode <> 'freundschaft' and (b.result -> 'winners') @> to_jsonb(r.seat) then
      perform private.emit(r.player_id, 'battle_won');
    end if;
  end loop;
  if b.mode <> 'freundschaft' and v_pot >= private.eur(private.cfg_num('battle.headline_base_cents')) then
    perform private.feed_add('battle', jsonb_build_object('battle', b.id, 'mode', b.mode, 'pot', v_pot,
      'name', (select coalesce(p.username, n.name) from game.battle_seats s left join game.players p on p.id = s.player_id
               left join game.npcs n on n.id = s.npc_id where s.battle_id = b.id and s.seat = (b.result -> 'winners' ->> 0)::int)));
  end if;
end $$;

create function private.tick_battles() returns void
language plpgsql set search_path = '' as $$
declare
  v_id bigint;
begin
  for v_id in select id from game.battles where state = 'running' and ends_at <= private.now() order by ends_at limit 100 loop
    begin
      perform private.battle_settle(v_id);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('battles', private.now(), 0, false, sqlerrm);
    end;
  end loop;
  -- Lobbies nobody started within a day are cancelled and refunded.
  for v_id in select id from game.battles where state = 'open' and created_at < private.now() - interval '1 day' loop
    begin
      perform private.battle_cancel(v_id);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('battles', private.now(), 0, false, sqlerrm);
    end;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('battles', 60);

create function private.battle_cancel(p_battle bigint) returns void
language plpgsql set search_path = '' as $$
declare
  s record;
begin
  for s in select * from game.battle_seats where battle_id = p_battle and player_id is not null and paid_cents > 0 loop
    perform private.money_add(s.player_id, s.paid_cents, 'battle_refund', p_battle::text);
  end loop;
  update game.battles set state = 'cancelled' where id = p_battle and state = 'open';
end $$;

-- ---------------------------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------------------------
create function public.battles_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.battles')::int,
    'round_seconds', private.cfg_num('battle.round_seconds')::int,
    'boosters', (select jsonb_agg(jsonb_build_object('product_id', d.id, 'price_cents', private.product_value(d.id)) order by d.id)
                 from game.product_defs d join game.set_defs s on s.id = d.set_id
                 where d.kind = 'booster' and s.phase not in ('announced', 'preorder')),
    'open', coalesce((select jsonb_agg(private.battle_summary(b, v_player) order by b.created_at desc)
                      from game.battles b where b.state = 'open'), '[]'::jsonb),
    'running', coalesce((select jsonb_agg(private.battle_summary(b, v_player) order by b.started_at desc)
                         from game.battles b where b.state = 'running'), '[]'::jsonb),
    'done', coalesce((select jsonb_agg(x.s order by x.ends_at desc) from (
                        select private.battle_summary(b, v_player) as s, b.ends_at from game.battles b
                        where b.state = 'done' order by b.ends_at desc limit 10) x), '[]'::jsonb)
  );
end $$;
select private.expose('public.battles_get()');

-- Settles a finished battle on the way (does not wait for the tick).
create function public.battle_get(p_battle bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  b game.battles;
begin
  perform private.battle_settle(p_battle);
  select * into b from game.battles where id = p_battle;
  if not found then
    perform private.fail('not_found');
  end if;
  return private.battle_doc(b, v_player);
end $$;
select private.expose('public.battle_get(bigint)');

create function public.battle_create(p_request_id uuid, p_mode text, p_product text, p_packs int, p_seats int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'battle_create');
  v_stake bigint;
  v_id bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'battles');
  perform private.rate_limit(v_player, 'battle', private.cfg_num('rate.battle')::int, 60);
  if p_mode is null or p_mode not in ('klassisch', 'krepel', 'top', 'jackpot', 'team', 'freundschaft')
     or coalesce(p_packs, 0) not between 1 and private.cfg_num('battle.max_packs')
     or coalesce(p_seats, 0) not between 2 and 4 or (p_mode = 'team' and p_seats <> 4)
     or not exists (select 1 from game.product_defs d join game.set_defs s on s.id = d.set_id
                    where d.id = p_product and d.kind = 'booster' and s.phase not in ('announced', 'preorder')) then
    perform private.fail('invalid_request');
  end if;
  v_stake := private.product_value(p_product) * p_packs;
  perform private.money_add(v_player, -v_stake, 'battle', p_product);
  insert into game.battles (host_id, mode, product_id, packs, seats, stake_cents, created_at)
  values (v_player, p_mode, p_product, p_packs, p_seats, v_stake, private.now())
  returning id into v_id;
  insert into game.battle_seats (battle_id, seat, player_id, paid_cents) values (v_id, 1, v_player, v_stake);
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'battle', private.battle_doc((select b from game.battles b where b.id = v_id), v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.battle_create(uuid, text, text, int, int)');

create function public.battle_join(p_request_id uuid, p_battle bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'battle_join');
  b game.battles;
  v_seat int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'battles');
  perform private.rate_limit(v_player, 'battle', private.cfg_num('rate.battle')::int, 60);
  select * into b from game.battles where id = p_battle for update;
  if not found or b.state <> 'open' then
    perform private.fail('not_found');
  end if;
  if exists (select 1 from game.battle_seats where battle_id = b.id and player_id = v_player) then
    perform private.fail('already_owned');
  end if;
  select g into v_seat from generate_series(1, b.seats) g
  where not exists (select 1 from game.battle_seats where battle_id = b.id and seat = g) order by g limit 1;
  if v_seat is null then
    perform private.fail('no_slots');
  end if;
  perform private.money_add(v_player, -b.stake_cents, 'battle', b.product_id);
  insert into game.battle_seats (battle_id, seat, player_id, paid_cents) values (b.id, v_seat, v_player, b.stake_cents);
  -- a full table starts by itself
  if (select count(*) from game.battle_seats where battle_id = b.id) = b.seats then
    perform private.battle_begin(b.id);
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'battle', private.battle_doc((select x from game.battles x where x.id = b.id), v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.battle_join(uuid, bigint)');

-- Leave an open lobby (money back). The host leaving cancels it for everybody.
create function public.battle_leave(p_request_id uuid, p_battle bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'battle_leave');
  b game.battles;
  s game.battle_seats;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into b from game.battles where id = p_battle for update;
  if not found or b.state <> 'open' then
    perform private.fail('not_found');
  end if;
  if b.host_id = v_player then
    perform private.battle_cancel(b.id);
  else
    delete from game.battle_seats where battle_id = b.id and player_id = v_player returning * into s;
    if not found then
      perform private.fail('not_found');
    end if;
    perform private.money_add(v_player, s.paid_cents, 'battle_refund', b.id::text);
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.battle_leave(uuid, bigint)');

-- The host starts; empty seats are filled with bots.
create function public.battle_start(p_request_id uuid, p_battle bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'battle_start');
  b game.battles;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into b from game.battles where id = p_battle for update;
  if not found or b.state <> 'open' then
    perform private.fail('not_found');
  end if;
  if b.host_id <> v_player then
    perform private.fail('forbidden');
  end if;
  perform private.battle_begin(b.id);
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'battle', private.battle_doc((select x from game.battles x where x.id = b.id), v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.battle_start(uuid, bigint)');

create function public.emote_send(p_request_id uuid, p_battle bigint, p_emote text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'emote_send');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'emote', private.cfg_num('rate.emote')::int, 60);
  if not private.cfg('battle.emotes') ? p_emote or not exists (select 1 from game.battles where id = p_battle and state in ('open', 'running', 'done')) then
    perform private.fail('invalid_request');
  end if;
  insert into game.battle_emotes (battle_id, player_id, emote, at) values (p_battle, v_player, p_emote, private.now());
  return private.request_done(v_player, p_request_id, jsonb_build_object('ok', true));
end $$;
select private.expose('public.emote_send(uuid, bigint, text)');
