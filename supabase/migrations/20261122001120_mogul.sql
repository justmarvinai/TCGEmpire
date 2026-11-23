-- alpha_11 (Mogul), part 3: the big sinks (docs/GAME_DESIGN.md §15). Luxus (level 55): items with tiny permanent
-- bonuses, shown on the profile and in their own toplist, kept through an exit. Megaprojekte (level 65): one
-- whole-server donation goal after another; reaching it gives everyone a permanent bonus (a modifier without a
-- player), the donors are on the plaque. Museum: the admin auctions 1-of-1 trophies; bids are held, the outbid
-- get their money back, a late bid extends the end; the winner goes into the Hall of Fame. All three are pure
-- sinks: nothing of it counts in net worth.

create table game.luxury_owned (
  player_id uuid not null references game.players (id) on delete cascade,
  key text not null,
  paid_cents bigint not null,
  at timestamptz not null,
  primary key (player_id, key)
);
alter table game.luxury_owned enable row level security;

create table game.megaprojects (
  key text primary key,
  donated_cents bigint not null default 0,
  done_at timestamptz
);
alter table game.megaprojects enable row level security;

create table game.mega_donations (
  key text not null,
  player_id uuid not null references game.players (id) on delete cascade,
  cents bigint not null,
  primary key (key, player_id)
);
create index mega_donations_player on game.mega_donations (player_id);
alter table game.mega_donations enable row level security;

create table game.museum_auctions (
  id bigint generated always as identity primary key,
  key text not null,
  start_cents bigint not null,
  bid_cents bigint,
  bidder_id uuid references game.players (id) on delete set null,
  state text not null default 'open' check (state in ('open', 'done')),
  created_at timestamptz not null,
  ends_at timestamptz not null
);
create index museum_auctions_bidder on game.museum_auctions (bidder_id);
create index museum_auctions_open on game.museum_auctions (state, ends_at);
alter table game.museum_auctions enable row level security;

create table game.trophies (
  key text primary key,
  owner_id uuid references game.players (id) on delete set null,
  paid_cents bigint not null,
  at timestamptz not null
);
create index trophies_owner on game.trophies (owner_id);
alter table game.trophies enable row level security;

-- An account reset gives the luxury back to nobody (it is gone) and leaves trophies and plaques as history.
create function private.on_player_reset_mogul() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.luxury_owned where player_id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_mogul after update of reset_at on game.players
  for each row execute function private.on_player_reset_mogul();

-- ---------------------------------------------------------------------------------------------
-- Luxus
-- ---------------------------------------------------------------------------------------------
create function private.luxury_doc(p_viewer uuid, p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.luxury')::int,
    'owned', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'at', at) order by at) from game.luxury_owned where player_id = p_player), '[]'::jsonb),
    'paid_cents', (select coalesce(sum(paid_cents), 0) from game.luxury_owned where player_id = p_player),
    'prices', case when p_viewer = p_player then
      (select jsonb_object_agg(key, private.eur((value ->> 'priceBaseCents')::numeric)) from jsonb_each(private.cfg('luxury.items'))) end
  )
$$;

-- Own luxury with prices, or another player's (for the profile).
create function public.luxury_get(p_player uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  if p_player is not null and not exists (select 1 from game.players where id = p_player) then
    perform private.fail('not_found');
  end if;
  return private.luxury_doc(v_player, coalesce(p_player, v_player));
end $$;
select private.expose('public.luxury_get(uuid)');

create function public.luxury_buy(p_request_id uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'luxury_buy');
  d jsonb := private.cfg('luxury.items') -> p_key;
  v_price bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if d is null then
    perform private.fail('invalid_request');
  end if;
  perform private.require_level(v_player, 'luxury');
  perform 1 from game.players where id = v_player for update;
  if (select level from game.players where id = v_player) < (d ->> 'level')::int then
    perform private.fail('locked');
  end if;
  if exists (select 1 from game.luxury_owned where player_id = v_player and key = p_key) then
    perform private.fail('already_owned');
  end if;
  v_price := private.eur((d ->> 'priceBaseCents')::numeric);
  perform private.money_add(v_player, -v_price, 'luxury', p_key);
  insert into game.luxury_owned (player_id, key, paid_cents, at) values (v_player, p_key, v_price, private.now());
  insert into game.modifiers (player_id, source, stat, op, value)
  values (v_player, 'luxury:' || p_key, d ->> 'stat', d ->> 'op', (d ->> 'value')::numeric)
  on conflict (player_id, source, stat) do update set value = excluded.value;
  perform private.emit(v_player, 'luxury_bought');
  perform private.feed_add('luxury', jsonb_build_object('name', (select username from game.players where id = v_player), 'key', p_key, 'cents', v_price));
  return private.request_done(v_player, p_request_id, private.luxury_doc(v_player, v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.luxury_buy(uuid, text)');

-- The Luxus toplist joins the others.
create or replace function public.toplist_get(p_list text, p_npcs boolean) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_days numeric := private.world_days();
  v_cards int := (select count(*) from game.card_defs);
  v_rivals boolean := coalesce(p_npcs, true) and p_list in ('worth', 'level', 'cash', 'collection', 'ruf');
  v_rows jsonb;
begin
  if p_list is null or p_list not in ('worth', 'level', 'cash', 'collection', 'ruf', 'best_pull', 'pechvogel', 'league', 'luxus') then
    perform private.fail('invalid_request');
  end if;

  with board as (
    select 'player' as kind, p.id::text as id, p.username as name, p.title, p.level, private.look(p) as look,
      case when p_list = 'best_pull' then p.best_pull_card end as card_id,
      case p_list
        when 'worth' then private.net_worth(p.id)::numeric
        when 'cash' then p.cash_cents::numeric
        when 'level' then p.level + case when p.level < 100 then p.ep::numeric / private.ep_to_next(p.level) else 0 end
        when 'collection' then private.collection_count(p.id)::numeric
        when 'ruf' then p.ruf::numeric
        when 'best_pull' then p.best_pull_cents::numeric
        when 'pechvogel' then coalesce((select total from game.counters where player_id = p.id and event = 'pechvogel'), 0)
        when 'luxus' then (select coalesce(sum(paid_cents), 0) from game.luxury_owned where player_id = p.id)::numeric
        else coalesce((select private.league_bps(l) from game.league l where l.week = private.week_start() and l.player_id = p.id), 0)
      end as score
    from game.players p
    union all
    select 'npc', r.id, r.name, null, floor(private.rival_level(r, v_days))::int, null, null,
      case p_list
        when 'worth' then private.rival_worth(r, v_days)::numeric
        when 'cash' then round(private.rival_worth(r, v_days) * 0.3)
        when 'level' then private.rival_level(r, v_days)
        when 'ruf' then private.rival_ruf(r, v_days)
        else floor(v_cards * least(0.97, (r.start_collection_pct + 1.5 * v_days) / 100))
      end
    from game.rivals r
    where v_rivals
  ), ranked as (
    select b.*, row_number() over (order by b.score desc, b.kind desc, b.name) as rank from board b
  ), mine as (
    select rank from ranked where kind = 'player' and id = v_player::text
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank', r.rank,
    'kind', r.kind,
    'id', r.id,
    'name', r.name,
    'title', r.title,
    'level', r.level,
    'value', case when p_list = 'level' then r.level else floor(r.score)::bigint end,
    'me', r.kind = 'player' and r.id = v_player::text,
    'look', r.look,
    'card_id', r.card_id
  ) order by r.rank), '[]'::jsonb)
  into v_rows
  from ranked r cross join mine m
  where r.rank <= private.cfg_num('toplist.size') or r.rank between m.rank - 1 and m.rank;

  return jsonb_build_object('list', p_list, 'npcs', v_rivals, 'cards_total', v_cards, 'rows', v_rows,
    'week_ends_at', (private.week_start() + 7)::timestamp at time zone 'Europe/Berlin');
end $$;

-- ---------------------------------------------------------------------------------------------
-- Megaprojekte
-- ---------------------------------------------------------------------------------------------
-- The project that takes donations now: the first in order that is not done.
create function private.mega_active() returns text
language sql stable set search_path = '' as $$
  select p ->> 'key' from jsonb_array_elements(private.cfg('mega.projects')) with ordinality as x(p, i)
  where not exists (select 1 from game.megaprojects m where m.key = p ->> 'key' and m.done_at is not null)
  order by i limit 1
$$;

create function private.mega_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.megaprojects')::int,
    'min_cents', private.eur(private.cfg_num('mega.min_base_cents')),
    'active', private.mega_active(),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', p ->> 'key',
        'goal_cents', private.eur((p ->> 'goalBaseCents')::numeric),
        'donated_cents', coalesce(m.donated_cents, 0),
        'done_at', m.done_at,
        'mine_cents', coalesce((select cents from game.mega_donations d where d.key = p ->> 'key' and d.player_id = p_player), 0),
        'donors', coalesce((select jsonb_agg(jsonb_build_object('name', pl.username, 'cents', d.cents) order by d.cents desc, pl.username)
                            from (select * from game.mega_donations d where d.key = p ->> 'key' order by d.cents desc limit 5) d
                            join game.players pl on pl.id = d.player_id), '[]'::jsonb)
      ) order by i)
      from jsonb_array_elements(private.cfg('mega.projects')) with ordinality as x(p, i)
      left join game.megaprojects m on m.key = p ->> 'key'
    ), '[]'::jsonb)
  )
$$;

create function public.megaprojects_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return private.mega_doc(v_player) || private.museum_doc(v_player);
end $$;

create function public.megaproject_donate(p_request_id uuid, p_cents bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'megaproject_donate');
  v_key text;
  p jsonb;
  m game.megaprojects;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'megaprojects');
  v_key := private.mega_active();
  if v_key is null then
    perform private.fail('not_found');
  end if;
  if p_cents is null or p_cents < private.eur(private.cfg_num('mega.min_base_cents')) then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  insert into game.megaprojects (key) values (v_key) on conflict do nothing;
  select * into m from game.megaprojects where key = v_key for update;
  select x into p from jsonb_array_elements(private.cfg('mega.projects')) x where x ->> 'key' = v_key;
  perform private.money_add(v_player, -p_cents, 'megaproject', v_key);
  update game.megaprojects set donated_cents = donated_cents + p_cents where key = v_key returning * into m;
  insert into game.mega_donations (key, player_id, cents) values (v_key, v_player, p_cents)
  on conflict (key, player_id) do update set cents = game.mega_donations.cents + excluded.cents;
  perform private.emit(v_player, 'mega_donated');
  if m.donated_cents >= private.eur((p ->> 'goalBaseCents')::numeric) then
    update game.megaprojects set done_at = private.now() where key = v_key;
    insert into game.modifiers (player_id, source, stat, op, value)
    values (null, 'mega:' || v_key, p ->> 'stat', p ->> 'op', (p ->> 'value')::numeric);
    perform private.feed_add('megaproject_done', jsonb_build_object('key', v_key,
      'name', (select pl.username from game.mega_donations d join game.players pl on pl.id = d.player_id
               where d.key = v_key order by d.cents desc limit 1)));
  end if;
  return private.request_done(v_player, p_request_id, private.mega_doc(v_player) || private.museum_doc(v_player)
    || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.megaproject_donate(uuid, bigint)');

-- ---------------------------------------------------------------------------------------------
-- Museum
-- ---------------------------------------------------------------------------------------------
create function private.museum_min_bid(a game.museum_auctions) returns bigint
language sql stable set search_path = '' as $$
  select case when a.bid_cents is null then a.start_cents
              else ceil(a.bid_cents * (100 + private.cfg_num('museum.raise_pct')) / 100)::bigint end
$$;

create function private.museum_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'auctions', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'key', a.key, 'start_cents', a.start_cents,
                  'bid_cents', a.bid_cents, 'bidder', (select username from game.players where id = a.bidder_id),
                  'mine', a.bidder_id = p_player, 'min_cents', private.museum_min_bid(a), 'ends_at', a.ends_at) order by a.ends_at)
                from game.museum_auctions a where a.state = 'open'), '[]'::jsonb),
    'hall', coalesce((select jsonb_agg(jsonb_build_object('key', t.key, 'owner', (select username from game.players where id = t.owner_id),
                  'paid_cents', t.paid_cents, 'at', t.at) order by t.at desc)
                from game.trophies t), '[]'::jsonb),
    'trophies_left', coalesce((select jsonb_agg(k order by i) from jsonb_array_elements_text(private.cfg('museum.trophies')) with ordinality as x(k, i)
                       where not exists (select 1 from game.trophies t where t.key = k)
                         and not exists (select 1 from game.museum_auctions a where a.key = k and a.state = 'open')), '[]'::jsonb)
  )
$$;

select private.expose('public.megaprojects_get()');

create function public.museum_bid(p_request_id uuid, p_auction bigint, p_cents bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'museum_bid');
  a game.museum_auctions;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'megaprojects');
  select * into a from game.museum_auctions where id = p_auction and state = 'open' and ends_at > private.now();
  if not found then
    perform private.fail('not_found');
  end if;
  perform private.lock_pair(v_player, coalesce(a.bidder_id, v_player));
  select * into a from game.museum_auctions where id = p_auction and state = 'open' and ends_at > private.now() for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if a.bidder_id = v_player then
    perform private.fail('already_done');
  end if;
  if p_cents is null or p_cents < private.museum_min_bid(a) then
    perform private.fail('bid_too_low');
  end if;
  perform private.money_add(v_player, -p_cents, 'museum_bid', a.id::text);
  if a.bidder_id is not null then
    perform private.money_add(a.bidder_id, a.bid_cents, 'museum_refund', a.id::text);
    perform private.notify(a.bidder_id, 'museum_outbid', jsonb_build_object('key', a.key, 'name',
      (select username from game.players where id = v_player), 'cents', p_cents));
  end if;
  update game.museum_auctions set bid_cents = p_cents, bidder_id = v_player,
    ends_at = greatest(ends_at, private.now() + make_interval(mins => private.cfg_num('museum.snipe_minutes')::int))
  where id = a.id;
  return private.request_done(v_player, p_request_id, private.mega_doc(v_player) || private.museum_doc(v_player)
    || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.museum_bid(uuid, bigint, bigint)');

-- The admin puts a trophy up (start price in euros, duration in hours).
create function public.admin_museum_start(p_request_id uuid, p_key text, p_start_cents bigint, p_hours int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_admin();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'admin_museum_start');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if not (private.cfg('museum.trophies') ? p_key) or p_start_cents is null or p_start_cents < 1 or p_hours is null or p_hours not between 1 and 168
     or exists (select 1 from game.trophies where key = p_key)
     or exists (select 1 from game.museum_auctions where key = p_key and state = 'open') then
    perform private.fail('invalid_request');
  end if;
  insert into game.museum_auctions (key, start_cents, created_at, ends_at)
  values (p_key, p_start_cents, private.now(), private.now() + make_interval(hours => p_hours));
  perform private.feed_add('museum_open', jsonb_build_object('key', p_key, 'cents', p_start_cents));
  return private.request_done(v_player, p_request_id, jsonb_build_object('ok', true));
end $$;
select private.expose('public.admin_museum_start(uuid, text, bigint, int)');

-- Ended auctions: the trophy goes to the highest bid (the money stays gone), or the auction ends without a buyer.
create function private.tick_museum() returns void
language plpgsql set search_path = '' as $$
declare
  a game.museum_auctions;
begin
  for a in select * from game.museum_auctions where state = 'open' and ends_at <= private.now() for update skip locked loop
    update game.museum_auctions set state = 'done' where id = a.id;
    if a.bidder_id is not null then
      insert into game.trophies (key, owner_id, paid_cents, at) values (a.key, a.bidder_id, a.bid_cents, private.now());
      perform private.notify(a.bidder_id, 'museum_won', jsonb_build_object('key', a.key, 'cents', a.bid_cents));
      perform private.emit(a.bidder_id, 'trophy_won');
      perform private.feed_add('museum_sold', jsonb_build_object('key', a.key, 'cents', a.bid_cents,
        'name', (select username from game.players where id = a.bidder_id)));
    end if;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('museum', 60);
