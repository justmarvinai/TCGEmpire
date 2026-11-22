-- alpha_10 (Risiko), part 1: the event engine (docs/GAME_DESIGN.md §19). Events are data (content/events.ts):
-- a Tagesereignis for everyone at 00:00, small random events on the market and for single players, and two or three
-- announced Highlight-Events a week. Their effects use what exists: modifiers (now also global ones, for everyone),
-- the market's hype and price pressure, store restocks, and one-off money, cards, Pfandbons or energy.

-- Global modifiers: a row without a player counts for everyone.
alter table game.modifiers alter column player_id drop not null;
create index modifiers_global on game.modifiers (stat) where player_id is null;

create or replace function private.stat(p_player uuid, p_stat text, p_base numeric default 0) returns numeric
language sql stable set search_path = '' as $$
  select (p_base + coalesce(sum(value) filter (where op = 'flat'), 0))
       * (1 + coalesce(sum(value) filter (where op = 'pct'), 0) / 100)
  from game.modifiers
  where (player_id = p_player or player_id is null) and stat = p_stat and (expires_at is null or expires_at > private.now())
$$;

-- The kiosk follows events (Kiosk-Rabatt, Preiserhöhung).
create or replace function private.kiosk_price(p_product text) returns bigint
language sql stable set search_path = '' as $$
  select private.eur(price_base_cents * private.cfg_num('kiosk.markup_bps') / 10000 * (1 + private.stat(null, 'kiosk_pct', 0) / 100))
  from game.product_defs where id = p_product
$$;

alter table game.server add column events_at timestamptz;

create table game.events (
  id bigint generated always as identity primary key,
  key text not null,
  slot text not null check (slot in ('daily', 'random', 'highlight', 'personal', 'admin', 'calendar')),
  player_id uuid references game.players (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  data jsonb not null default '{}',
  applied boolean not null default false
);
create index events_ends on game.events (ends_at);
create index events_player on game.events (player_id, starts_at);
create index events_pending on game.events (starts_at) where not applied;
alter table game.events enable row level security;

-- A store restocks now (the admin's restock, reused by events).
create function private.store_restock_now(p_store text) returns void
language plpgsql set search_path = '' as $$
declare
  s game.store_defs;
  v_active int := greatest(2, (select count(*) from game.players where last_seen_at > private.now() - interval '72 hours')::int);
begin
  select * into s from game.store_defs where key = p_store and jsonb_array_length(restocks) > 0;
  if not found then
    return;
  end if;
  insert into game.store_waves (store, product_id, wave_at, qty_total, qty_left, npc_taken)
  select s.key, p ->> 'id', private.now(), s.stock_per_player * v_active, s.stock_per_player * v_active, 0
  from jsonb_array_elements(s.products) p
  join game.product_defs pd on pd.id = p ->> 'id'
  join game.set_defs sd on sd.id = pd.set_id and sd.phase in ('print', 'last_wave')
  on conflict (store, product_id) do update
    set wave_at = excluded.wave_at, qty_total = excluded.qty_total, qty_left = excluded.qty_left, npc_taken = 0;
  perform private.feed_add('restock', jsonb_build_object('store', s.key));
end $$;

create function private.event_def(p_key text) returns jsonb
language sql stable set search_path = '' as $$
  select private.cfg('events.defs') -> p_key
$$;

-- A weighted random event of a slot (personal ones that need a home only for players with one).
create function private.event_pick(p_slot text, p_player uuid default null) returns text
language sql volatile set search_path = '' as $$
  with pool as (
    select key, (value ->> 'weight')::numeric as w from jsonb_each(private.cfg('events.defs'))
    where value -> 'slots' ? p_slot
      and (not coalesce((value -> 'effect' ->> 'needsHome')::boolean, false) or coalesce(private.home_tier(p_player), 0) > 0)
  ), cum as (
    select key, sum(w) over (order by key) as c, sum(w) over () as total from pool
  ), r as materialized (
    select private.rand() * (select max(total) from cum) as x
  )
  select key from cum, r where cum.c > r.x order by cum.c limit 1
$$;

create function private.event_create(p_key text, p_slot text, p_player uuid, p_starts timestamptz, p_ends timestamptz) returns bigint
language sql set search_path = '' as $$
  insert into game.events (key, slot, player_id, starts_at, ends_at)
  values (p_key, p_slot, p_player, p_starts,
          coalesce(p_ends, p_starts + make_interval(mins => greatest(1, round((private.event_def(p_key) ->> 'hours')::numeric * 60))::int)))
  returning id
$$;

-- Applies an event when it starts.
create function private.event_start(p_event bigint) returns void
language plpgsql set search_path = '' as $$
declare
  e game.events;
  eff jsonb;
  v_data jsonb := '{}';
  v_game text;
  v_card text;
  v_set text;
  v_store text;
  v_cents bigint;
  v_level int;
  i int;
begin
  select * into e from game.events where id = p_event and not applied for update skip locked;
  if not found then
    return;
  end if;
  eff := private.event_def(e.key) -> 'effect';
  if eff ? 'stat' then
    insert into game.modifiers (player_id, source, stat, op, value, expires_at)
    values (e.player_id, 'event:' || e.id, eff -> 'stat' ->> 'stat', eff -> 'stat' ->> 'op', (eff -> 'stat' ->> 'value')::numeric, e.ends_at);
  end if;
  if eff ? 'hype' then
    select game into v_game from game.market order by private.rand() limit 1;
    update game.market set hype = least(private.cfg_num('market.hype_max'), greatest(private.cfg_num('market.hype_min'),
      hype * (eff -> 'hype' ->> 'factor')::numeric))
    where eff -> 'hype' ->> 'game' = 'all' or game = v_game;
    v_data := v_data || jsonb_build_object('game', case when eff -> 'hype' ->> 'game' = 'all' then null else v_game end);
  end if;
  if eff ? 'pressure' then
    if eff -> 'pressure' ->> 'pick' = 'hit' then
      select d.id into v_card from game.card_defs d join game.set_defs s on s.id = d.set_id
      where d.tier in ('holo', 'alternative', 'ultra', 'grail') and s.phase <> 'announced' order by private.rand() limit 1;
      update game.prices set pressure = pressure * (eff -> 'pressure' ->> 'factor')::numeric where item_id = v_card;
      v_data := v_data || jsonb_build_object('card_id', v_card);
    else
      select id into v_set from game.set_defs where phase <> 'announced' order by private.rand() limit 1;
      update game.prices set pressure = pressure * (eff -> 'pressure' ->> 'factor')::numeric where set_id = v_set and kind = 'card';
      v_data := v_data || jsonb_build_object('set_id', v_set);
    end if;
  end if;
  if eff ? 'restock' then
    for v_store in select key from game.store_defs where jsonb_array_length(restocks) > 0 and private.store_open(key)
                   order by case when eff ->> 'restock' = 'random' then private.rand() else 0 end, key loop
      perform private.store_restock_now(v_store);
      v_data := v_data || jsonb_build_object('store', v_store);
      exit when eff ->> 'restock' = 'random';
    end loop;
  end if;
  if e.player_id is not null then
    v_level := (select level from game.players where id = e.player_id);
    if eff ? 'money' then
      v_cents := round(private.eur(private.ref_income_base(v_level) * (eff ->> 'money')::numeric / 60));
      if v_cents < 0 then
        v_cents := -least(-v_cents, (select cash_cents from game.players where id = e.player_id));
      end if;
      if v_cents <> 0 then
        perform private.money_add(e.player_id, v_cents, 'event', e.key);
      end if;
      v_data := v_data || jsonb_build_object('cents', v_cents);
    end if;
    if eff ? 'cards' then
      for i in 1 .. (eff ->> 'cards')::int loop
        select d.id into v_card from game.card_defs d join game.set_defs s on s.id = d.set_id
        where s.game = coalesce((select fav_game from game.players where id = e.player_id), 'pokemon')
          and s.phase <> 'announced' and d.tier in ('common', 'uncommon', 'rare', 'holo')
        order by private.rand() * case d.tier when 'common' then 1 when 'uncommon' then 2 when 'rare' then 4 else 12 end limit 1;
        if v_card is not null then
          perform private.give_card(e.player_id, v_card);
        end if;
      end loop;
    end if;
    if eff ? 'pfandbons' then
      update game.players set pfandbons = pfandbons + (eff ->> 'pfandbons')::int where id = e.player_id;
    end if;
    if eff ? 'energy' then
      begin
        perform private.energy_change(e.player_id, (eff ->> 'energy')::int);
      exception when others then
        null;
      end;
    end if;
    perform private.notify(e.player_id, 'event', jsonb_build_object('key', e.key) || v_data);
  else
    perform private.feed_add('event', jsonb_build_object('key', e.key, 'slot', e.slot) || v_data);
  end if;
  update game.events set applied = true, data = v_data where id = e.id;
end $$;

-- Every minute: what is due starts; the day's event, the week's highlights, random ones.
create function private.tick_events() returns void
language plpgsql set search_path = '' as $$
declare
  v_now timestamptz := private.now();
  v_last timestamptz := coalesce((select events_at from game.server where id), v_now - interval '1 minute');
  v_hours numeric := least(24, greatest(0, extract(epoch from v_now - v_last) / 3600));
  v_midnight timestamptz := private.today()::timestamp at time zone 'Europe/Berlin';
  v_week timestamptz := private.week_start()::timestamp at time zone 'Europe/Berlin';
  v_key text;
  v_at timestamptz;
  t jsonb;
  p record;
  v_id bigint;
begin
  if not (private.cfg('events.enabled'))::boolean then
    return;
  end if;
  update game.server set events_at = v_now where id;
  -- the Tagesereignis
  if not exists (select 1 from game.events where slot = 'daily' and starts_at = v_midnight) then
    v_key := private.event_pick('daily');
    if v_key is not null then
      perform private.event_create(v_key, 'daily', null, v_midnight, v_midnight + interval '1 day');
    end if;
  end if;
  -- this week's highlights, announced as soon as they are planned
  for t in select * from jsonb_array_elements(private.cfg('events.highlight_times')) loop
    v_at := (private.week_start() + ((t ->> 0)::int - 1) + (t ->> 1)::time) at time zone 'Europe/Berlin';
    if v_at > v_now and not exists (select 1 from game.events where slot = 'highlight' and starts_at = v_at) then
      select key into v_key from (
        select key from jsonb_each(private.cfg('events.defs'))
        where value -> 'slots' ? 'highlight'
          and key not in (select key from game.events where slot = 'highlight' and starts_at >= v_week)
        order by private.rand() * (value ->> 'weight')::numeric desc limit 1) x;
      if v_key is not null then
        perform private.event_create(v_key, 'highlight', null, v_at, null);
        perform private.feed_add('event_announce', jsonb_build_object('key', v_key, 'starts_at', v_at));
      end if;
    end if;
  end loop;
  -- something happens on the market
  if private.rand() < 1 - exp(-private.cfg_num('events.random_per_hour') * v_hours) then
    v_key := private.event_pick('random');
    if v_key is not null then
      perform private.event_create(v_key, 'random', null, v_now, null);
    end if;
  end if;
  -- something happens to a player who has been around lately
  for p in select id from game.players
           where last_seen_at > v_now - make_interval(hours => private.cfg_num('events.personal_active_hours')::int) loop
    if private.rand() < 1 - exp(-private.cfg_num('events.personal_per_hour') * v_hours) then
      v_key := private.event_pick('personal', p.id);
      if v_key is not null then
        perform private.event_create(v_key, 'personal', p.id, v_now, null);
      end if;
    end if;
  end loop;
  -- start what is due
  for v_id in select id from game.events where not applied and starts_at <= v_now order by starts_at, id loop
    begin
      perform private.event_start(v_id);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('events', v_now, 0, false, sqlerrm);
      update game.events set applied = true where id = v_id;
    end;
  end loop;
  delete from game.events where ends_at < v_now - interval '14 days';
end $$;
insert into game.tick_systems (name, every_seconds) values ('events', 60);

create function private.event_doc(e game.events) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id', e.id, 'key', e.key, 'slot', e.slot, 'starts_at', e.starts_at, 'ends_at', e.ends_at, 'data', e.data)
$$;

create function public.events_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_now timestamptz := private.now();
begin
  return jsonb_build_object(
    'today', (select private.event_doc(e) from game.events e where e.slot = 'daily' and e.starts_at <= v_now and e.ends_at > v_now
              order by e.starts_at desc limit 1),
    'active', coalesce((select jsonb_agg(private.event_doc(e) order by e.starts_at) from game.events e
                        where e.player_id is null and e.slot <> 'daily' and e.applied and e.starts_at <= v_now and e.ends_at > v_now), '[]'::jsonb),
    'upcoming', coalesce((select jsonb_agg(private.event_doc(e) order by e.starts_at) from game.events e
                          where e.player_id is null and e.starts_at > v_now and e.starts_at < v_now + interval '8 days'), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(private.event_doc(e) order by e.starts_at desc) from game.events e
                      where e.player_id = v_player and e.applied and e.starts_at > v_now - interval '1 day'), '[]'::jsonb)
  );
end $$;
select private.expose('public.events_get()');

-- The admin starts any event now (for everyone, or for one player if it is a personal one).
create function public.admin_event_start(p_request_id uuid, p_key text, p_player uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_admin();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'admin_event_start');
  d jsonb := private.event_def(p_key);
  v_id bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if d is null or ((d -> 'slots' ? 'personal') <> (p_player is not null))
     or (p_player is not null and not exists (select 1 from game.players where id = p_player)) then
    perform private.fail('invalid_request');
  end if;
  v_id := private.event_create(p_key, 'admin', p_player, private.now(), null);
  perform private.event_start(v_id);
  return private.request_done(v_player, p_request_id, private.admin_doc());
end $$;
select private.expose('public.admin_event_start(uuid, text, uuid)');
