-- alpha_10 (Risiko), part 3: calendar events (docs/GAME_DESIGN.md §19), the Adventskalender, the Sonntags-Flohmarkt
-- and Bares für Rares (§7).
-- Calendar events are ordinary events with a `when`: every week on a weekday or every year between two days. A tick
-- creates and starts them for their whole period. The Adventskalender's doors are personal calendar events, so they
-- pay out like personal events; on Sundays Flohmarkt-Horst puts cheap ads into the Kleinanzeigen.

-- ---------------------------------------------------------------------------------------------
-- Calendar
-- ---------------------------------------------------------------------------------------------
create function private.flohmarkt_stock(p_until timestamptz) returns void
language plpgsql set search_path = '' as $$
declare
  a game.ads;
  v_ask numeric;
  i int;
begin
  for i in 1 .. private.cfg_num('flohmarkt.stalls')::int loop
    perform private.ad_create_npc();
    select * into a from game.ads where seller_id is null order by id desc limit 1;
    v_ask := private.card_or_product_value(a.item_id) * a.qty
      * private.rand_between(private.cfg_num('flohmarkt.price_min_pct'), private.cfg_num('flohmarkt.price_max_pct')) / 100;
    update game.ads set npc_id = 'horst', style = 'attic', ask_cents = greatest(1, round(v_ask)),
      min_cents = greatest(1, round(v_ask * private.rand_between(0.7, 0.9))), expires_at = p_until
    where id = a.id;
  end loop;
end $$;

-- Every minute: calendar events whose period has come are created and started once.
create function private.tick_calendar() returns void
language plpgsql set search_path = '' as $$
declare
  d record;
  v_today date := private.today();
  v_from date;
  v_to date;
  v_start timestamptz;
  v_end timestamptz;
begin
  if not (private.cfg('events.enabled'))::boolean then
    return;
  end if;
  for d in select key, value -> 'when' as w from jsonb_each(private.cfg('events.defs')) where value ? 'when' order by key loop
    if d.w ? 'weekday' then
      continue when extract(isodow from v_today) <> (d.w ->> 'weekday')::int;
      v_from := v_today;
      v_to := v_today;
    else
      v_from := make_date(extract(year from v_today)::int, split_part(d.w ->> 'from', '-', 1)::int, split_part(d.w ->> 'from', '-', 2)::int);
      v_to := make_date(extract(year from v_today)::int, split_part(d.w ->> 'to', '-', 1)::int, split_part(d.w ->> 'to', '-', 2)::int);
      continue when v_today < v_from or v_today > v_to;
    end if;
    v_start := v_from::timestamp at time zone 'Europe/Berlin';
    v_end := (v_to + 1)::timestamp at time zone 'Europe/Berlin';
    if not exists (select 1 from game.events where key = d.key and player_id is null and starts_at = v_start) then
      perform private.event_start(private.event_create(d.key, 'calendar', null, v_start, v_end));
      if d.key = 'flohmarkt' then
        perform private.flohmarkt_stock(v_end);
      end if;
    end if;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('calendar', 60);

-- The events page also shows the Adventskalender: today's door and the doors already opened.
create or replace function public.events_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_now timestamptz := private.now();
  v_advent game.events;
begin
  select * into v_advent from game.events
  where key = 'advent' and player_id is null and starts_at <= v_now and ends_at > v_now limit 1;
  return jsonb_build_object(
    'today', (select private.event_doc(e) from game.events e where e.slot = 'daily' and e.starts_at <= v_now and e.ends_at > v_now
              order by e.starts_at desc limit 1),
    'active', coalesce((select jsonb_agg(private.event_doc(e) order by e.starts_at) from game.events e
                        where e.player_id is null and e.slot <> 'daily' and e.applied and e.starts_at <= v_now and e.ends_at > v_now), '[]'::jsonb),
    'upcoming', coalesce((select jsonb_agg(private.event_doc(e) order by e.starts_at) from game.events e
                          where e.player_id is null and e.starts_at > v_now and e.starts_at < v_now + interval '8 days'), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(private.event_doc(e) order by e.starts_at desc) from game.events e
                      where e.player_id = v_player and e.applied and e.starts_at > v_now - interval '1 day'), '[]'::jsonb),
    'advent', case when v_advent.id is not null then jsonb_build_object(
      'day', extract(day from private.today())::int,
      'opened', coalesce((select jsonb_agg(substr(e.key, 8)::int order by e.starts_at) from game.events e
                          where e.player_id = v_player and e.key like 'advent\_%' and e.starts_at >= v_advent.starts_at), '[]'::jsonb)) end
  );
end $$;

-- Today's door of the Adventskalender (once a day, only today's).
create function public.advent_open(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'advent_open');
  v_key text := 'advent_' || extract(day from private.today())::int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if private.event_def(v_key) is null or not exists (
       select 1 from game.events where key = 'advent' and player_id is null and starts_at <= private.now() and ends_at > private.now()) then
    perform private.fail('not_found');
  end if;
  perform 1 from game.players where id = v_player for update;
  if exists (select 1 from game.events where key = v_key and player_id = v_player
             and starts_at >= private.today()::timestamp at time zone 'Europe/Berlin') then
    perform private.fail('already_done');
  end if;
  perform private.event_start(private.event_create(v_key, 'calendar', v_player, private.now(), private.now() + interval '1 minute'));
  return private.request_done(v_player, p_request_id, public.events_get() || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.advent_open(uuid)');

-- ---------------------------------------------------------------------------------------------
-- Bares für Rares: once a German day, one hit or slab, an appraisal and the dealers' bids
-- ---------------------------------------------------------------------------------------------
create table game.bares (
  player_id uuid not null references game.players (id) on delete cascade,
  day date not null,
  copy_id uuid references game.card_copies (id) on delete set null,
  card_id text not null references game.card_defs (id),
  grader text,
  grade numeric,
  black_label boolean not null default false,
  value_cents bigint not null,
  estimate_cents bigint not null,
  offers jsonb not null,
  sold int,
  at timestamptz not null,
  primary key (player_id, day)
);
create index bares_copy on game.bares (copy_id);
create index bares_card on game.bares (card_id);
alter table game.bares enable row level security;

create function private.bares_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.bares')::int,
    'today', (select jsonb_build_object('card_id', b.card_id, 'grader', b.grader, 'grade', b.grade, 'black_label', b.black_label,
                'value_cents', b.value_cents, 'estimate_cents', b.estimate_cents, 'offers', b.offers, 'sold', b.sold)
              from game.bares b where b.player_id = p_player and b.day = private.today()),
    'copies', coalesce((
      select jsonb_agg(jsonb_build_object('copy_id', c.id, 'card_id', c.card_id, 'grader', c.grader, 'grade', c.grade,
               'black_label', c.black_label, 'value_cents', c.v) order by c.v desc, c.id)
      from (select x.*, private.slab_value(x.card_id, x.grader, x.grade, x.black_label) as v
            from game.card_copies x where x.owner_id = p_player and x.location = 'inventory'
            order by v desc, x.id limit private.cfg_num('bares.copies')::int) c
    ), '[]'::jsonb)
  )
$$;

create function public.bares_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return private.bares_doc(v_player);
end $$;
select private.expose('public.bares_get()');

-- Into the studio: the expert appraises, three dealers bid (and the one who always says 80 €).
create function public.bares_appraise(p_request_id uuid, p_copy uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'bares_appraise');
  c game.card_copies;
  v_value bigint;
  v_offers jsonb := '[]';
  i int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'bares');
  perform 1 from game.players where id = v_player for update;
  if exists (select 1 from game.bares where player_id = v_player and day = private.today()) then
    perform private.fail('already_done');
  end if;
  select * into c from game.card_copies where id = p_copy and owner_id = v_player and location = 'inventory';
  if not found then
    perform private.fail('not_owned');
  end if;
  v_value := private.slab_value(c.card_id, c.grader, c.grade, c.black_label);
  for i in 1 .. private.cfg_num('bares.dealers')::int loop
    v_offers := v_offers || jsonb_build_object('dealer', floor(private.rand() * private.cfg_num('bares.dealer_count'))::int,
      'cents', greatest(1, round(v_value * private.rand_between(private.cfg_num('bares.bid_min_pct'), private.cfg_num('bares.bid_max_pct')) / 100)));
  end loop;
  v_offers := v_offers || jsonb_build_object('dealer', null, 'cents', private.eur(private.cfg_num('bares.fixed_base_cents')));
  insert into game.bares (player_id, day, copy_id, card_id, grader, grade, black_label, value_cents, estimate_cents, offers, at)
  values (v_player, private.today(), c.id, c.card_id, c.grader, c.grade, c.black_label, v_value,
          round(v_value * private.rand_between(private.cfg_num('bares.estimate_min_pct'), private.cfg_num('bares.estimate_max_pct')) / 100),
          v_offers, private.now());
  return private.request_done(v_player, p_request_id, private.bares_doc(v_player));
end $$;
select private.expose('public.bares_appraise(uuid, uuid)');

-- Deal (an offer's index) or no deal (null): either way, the day's show is over.
create function public.bares_deal(p_request_id uuid, p_offer int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'bares_deal');
  b game.bares;
  v_cents bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform 1 from game.players where id = v_player for update;
  select * into b from game.bares where player_id = v_player and day = private.today() and sold is null for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if p_offer is null then
    update game.bares set sold = -1 where player_id = v_player and day = b.day;
    return private.request_done(v_player, p_request_id, private.bares_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
  end if;
  if p_offer < 0 or p_offer >= jsonb_array_length(b.offers) then
    perform private.fail('invalid_request');
  end if;
  delete from game.card_copies where id = b.copy_id and owner_id = v_player and location = 'inventory';
  if not found then
    perform private.fail('not_owned');
  end if;
  v_cents := (b.offers -> p_offer ->> 'cents')::bigint;
  perform private.money_add(v_player, v_cents, 'bares', b.card_id);
  update game.bares set sold = p_offer where player_id = v_player and day = b.day;
  perform private.emit(v_player, 'bares_deal');
  if v_cents >= private.eur(private.cfg_num('feed.big_deal_base_cents')) then
    perform private.feed_add('bares', jsonb_build_object('name', (select username from game.players where id = v_player),
      'card_id', b.card_id, 'cents', v_cents, 'estimate_cents', b.estimate_cents));
  end if;
  return private.request_done(v_player, p_request_id, private.bares_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.bares_deal(uuid, int)');
