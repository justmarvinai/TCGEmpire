-- alpha_04 (Flip), part 1: market values (docs/ECONOMY.md §5.2). Every card and sealed product has one
-- Marktwert, recomputed every 5 minutes:
--   value = base × P × set factor × hype of its game × own hype × pressure
-- bounded per day; history is thinned (5-minute points for 2 days, hourly for 14 days, daily forever).

alter table game.set_defs
  add column packs_opened bigint not null default 0,
  add column phase_at timestamptz,
  add column oop_at timestamptz,
  add column sealed_at_oop bigint;

create table game.market (
  game text primary key,
  hype numeric not null default 1
);

create table game.prices (
  item_id text primary key,
  kind text not null check (kind in ('card', 'sealed')),
  set_id text not null references game.set_defs (id),
  base_cents bigint not null,
  hype numeric not null default 1,
  pressure numeric not null default 1,
  value_cents bigint not null,
  day date,
  day_open_cents bigint,
  updated_at timestamptz
);
create index prices_set on game.prices (set_id);

create table game.price_history (
  item_id text not null references game.prices (item_id) on delete cascade,
  at timestamptz not null,
  value_cents bigint not null,
  primary key (item_id, at)
);

alter table game.market enable row level security;
alter table game.prices enable row level security;
alter table game.price_history enable row level security;

-- Standard normal draw (Box–Muller) on the seeded generator, for the random walks.
create function private.rand_normal() returns double precision
language sql volatile set search_path = '' as $$
  select sqrt(-2 * ln(greatest(private.rand(), 1e-12))) * cos(2 * pi() * private.rand())
$$;

-- Sealed boosters of a set that still exist (players; stores and NPCs join with their tables).
create function private.sealed_left(p_set text) returns bigint
language sql stable set search_path = '' as $$
  select coalesce(sum(s.qty), 0)::bigint
  from game.sealed s
  join game.product_defs pd on pd.id = s.product_id
  where pd.set_id = p_set and pd.kind = 'booster'
$$;

-- Supply factor of a set: in print it falls from start to floor as packs are opened; out of print it rises
-- with scarcity (sealed left versus sealed at the end of print) and age, steeper for sealed product.
create function private.set_factor(p_set text, p_kind text) returns numeric
language plpgsql stable set search_path = '' as $$
declare
  s game.set_defs;
  v numeric;
begin
  select * into s from game.set_defs where id = p_set;
  if s.phase in ('oop', 'vintage') then
    v := private.cfg_num('market.oop_a')
           * power(greatest(0, 1 - private.sealed_left(p_set)::numeric / greatest(1, coalesce(s.sealed_at_oop, 1))), private.cfg_num('market.oop_b'))
         + private.cfg_num('market.oop_week') * greatest(0, extract(epoch from private.now() - coalesce(s.oop_at, private.now())) / 604800);
    if p_kind = 'sealed' then
      v := v * private.cfg_num('market.oop_sealed_mult');
    end if;
    return least(private.cfg_num('market.oop_cap'), 1 + v);
  end if;
  if p_kind = 'sealed' then
    return 1;
  end if;
  return private.cfg_num('market.print_floor')
       + (private.cfg_num('market.print_start') - private.cfg_num('market.print_floor'))
       * exp(-s.packs_opened / private.cfg_num('market.print_packs'));
end $$;

-- The Marktwert replaces the alpha_02 rule (base × P), which stays the fallback for new catalog entries.
create or replace function private.card_value(p_card text) returns bigint
language sql stable set search_path = '' as $$
  select coalesce(
    (select value_cents from game.prices where item_id = p_card),
    (select private.eur(value_base_cents) from game.card_defs where id = p_card)
  )
$$;

create function private.product_value(p_product text) returns bigint
language sql stable set search_path = '' as $$
  select coalesce(
    (select value_cents from game.prices where item_id = p_product),
    (select private.eur(price_base_cents) from game.product_defs where id = p_product)
  )
$$;

-- A trade nudges the Marktwert towards its price (above: up, below: down). Trades far away from the
-- Marktwert do not count, so nobody can push prices with wash trades.
create function private.price_push(p_item text, p_price bigint) returns void
language sql set search_path = '' as $$
  update game.prices
  set pressure = least(private.cfg_num('market.pressure_max'), greatest(private.cfg_num('market.pressure_min'),
    pressure * (1 + sign(p_price - value_cents) * private.cfg_num('market.pressure_step'))))
  where item_id = p_item
    and p_price between value_cents * (1 - private.cfg_num('market.push_band_pct') / 100)
                    and value_cents * (1 + private.cfg_num('market.push_band_pct') / 100)
$$;

-- Every opened pack counts for its set (the in-print price decay and the out-of-print scarcity).
alter function private.roll_pack(uuid, text) rename to roll_pack_cards;
create function private.roll_pack(p_player uuid, p_product text) returns text[]
language plpgsql volatile set search_path = '' as $$
begin
  update game.set_defs set packs_opened = packs_opened + 1
  where id = (select set_id from game.product_defs where id = p_product);
  return private.roll_pack_cards(p_player, p_product);
end $$;

create function private.tick_market() returns void
language plpgsql set search_path = '' as $$
declare
  v_now timestamptz := private.now();
  v_today date := private.today();
  v_p numeric := (select price_level from game.server where id);
begin
  -- Catalog entries get their price row; base values follow the seeded catalog.
  insert into game.prices (item_id, kind, set_id, base_cents, value_cents)
  select id, 'card', set_id, value_base_cents, round(value_base_cents * v_p) from game.card_defs
  on conflict (item_id) do update set base_cents = excluded.base_cents;
  insert into game.prices (item_id, kind, set_id, base_cents, value_cents)
  select id, 'sealed', set_id, price_base_cents, round(price_base_cents * v_p) from game.product_defs
  on conflict (item_id) do update set base_cents = excluded.base_cents;
  insert into game.market (game) select distinct game from game.set_defs on conflict do nothing;

  -- Hype-Index per game: a slow mean-reverting random walk inside its band.
  update game.market set hype = least(private.cfg_num('market.hype_max'), greatest(private.cfg_num('market.hype_min'),
    hype + private.cfg_num('market.hype_revert') * (1 - hype) + private.cfg_num('market.hype_sigma') * private.rand_normal()))
  where true;

  -- Own hype drifts back to 1 with noise; pressure fades towards 1 with its half-life.
  update game.prices set
    hype = least(private.cfg_num('market.card_hype_max'), greatest(private.cfg_num('market.card_hype_min'),
      1 + (hype - 1) * (1 - private.cfg_num('market.card_hype_revert')) + private.cfg_num('market.card_hype_sigma') * private.rand_normal())),
    pressure = 1 + (pressure - 1) * power(0.5,
      greatest(0, extract(epoch from v_now - coalesce(updated_at, v_now))) / 3600 / private.cfg_num('market.pressure_half_life_h'))
  where true;

  -- New Marktwert, bounded per day against the day's opening value. Sealed in print stays between a
  -- floor and a ceiling around its list price.
  with f as (
    select p.item_id,
      case when p.day is distinct from v_today then p.value_cents else p.day_open_cents end as open_cents,
      case when p.kind = 'sealed' and s.phase not in ('oop', 'vintage')
        then p.base_cents * v_p * least(private.cfg_num('market.sealed_print_max'),
               greatest(private.cfg_num('market.sealed_floor'), m.hype * p.hype * p.pressure))
        else p.base_cents * v_p * private.set_factor(p.set_id, p.kind) * m.hype * p.hype * p.pressure
      end as raw
    from game.prices p
    join game.set_defs s on s.id = p.set_id
    join game.market m on m.game = s.game
  )
  update game.prices p set
    day = v_today,
    day_open_cents = f.open_cents,
    value_cents = greatest(1, round(least(f.open_cents * (1 + private.cfg_num('market.day_up_pct') / 100),
      greatest(f.open_cents * (1 - private.cfg_num('market.day_down_pct') / 100), f.raw)))),
    updated_at = v_now
  from f
  where f.item_id = p.item_id;

  insert into game.price_history (item_id, at, value_cents)
  select item_id, v_now, value_cents from game.prices
  on conflict do nothing;
end $$;

-- Thinning: 5-minute points for the fine window, then one per hour, then one per day.
create function private.tick_history() returns void
language plpgsql set search_path = '' as $$
declare
  v_fine timestamptz := private.now() - make_interval(hours => private.cfg_num('market.history_fine_h')::int);
  v_hourly timestamptz := private.now() - make_interval(days => private.cfg_num('market.history_hourly_d')::int);
begin
  delete from game.price_history h
  using (
    select item_id, at, row_number() over (partition by item_id, date_trunc('hour', at) order by at) as n
    from game.price_history where at < v_fine and at >= v_hourly
  ) x
  where x.n > 1 and h.item_id = x.item_id and h.at = x.at;
  delete from game.price_history h
  using (
    select item_id, at, row_number() over (partition by item_id, date_trunc('day', at) order by at) as n
    from game.price_history where at < v_hourly
  ) x
  where x.n > 1 and h.item_id = x.item_id and h.at = x.at;
end $$;

insert into game.tick_systems (name, every_seconds) values ('market', 300), ('history', 3600);

-- One item's market page: Marktwert, change today, factors and the history for the chart.
create function public.market_item(p_item text, p_range text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  p game.prices;
  v_from timestamptz;
begin
  select * into p from game.prices where item_id = p_item;
  if not found then
    perform private.fail('not_found');
  end if;
  v_from := private.now() - case p_range
    when 'day' then interval '24 hours' when 'week' then interval '7 days' when 'month' then interval '30 days'
    else interval '20 years' end;
  return jsonb_build_object(
    'item_id', p.item_id,
    'kind', p.kind,
    'set_id', p.set_id,
    'value_cents', p.value_cents,
    'change_pct', case when coalesce(p.day_open_cents, 0) > 0
      then round(100.0 * (p.value_cents - p.day_open_cents) / p.day_open_cents, 1) else 0 end,
    'phase', (select phase from game.set_defs where id = p.set_id),
    'game_hype', (select m.hype from game.market m join game.set_defs s on s.game = m.game where s.id = p.set_id),
    'hype', p.hype,
    'history', coalesce((
      select jsonb_agg(jsonb_build_array(extract(epoch from h.at)::bigint, h.value_cents) order by h.at)
      from game.price_history h where h.item_id = p.item_id and h.at >= v_from
    ), '[]'::jsonb)
  );
end $$;
select private.expose('public.market_item(text, text)');

-- The market at a glance: Hype-Index per game, set phases, today's biggest movers.
create function public.market_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object(
    'games', coalesce((select jsonb_agg(jsonb_build_object('game', game, 'hype', round(hype, 3)) order by game) from game.market), '[]'::jsonb),
    'sets', coalesce((
      select jsonb_agg(jsonb_build_object('set_id', id, 'phase', phase, 'packs_opened', packs_opened) order by id) from game.set_defs
    ), '[]'::jsonb),
    'movers', coalesce((
      select jsonb_agg(jsonb_build_object('item_id', item_id, 'kind', kind, 'value_cents', value_cents,
        'change_pct', round(100.0 * (value_cents - day_open_cents) / day_open_cents, 1)) order by abs(value_cents - day_open_cents)::numeric / day_open_cents desc)
      from (
        select * from game.prices
        where coalesce(day_open_cents, 0) > 0 and value_cents <> day_open_cents
        order by abs(value_cents - day_open_cents)::numeric / day_open_cents desc
        limit 8
      ) m
    ), '[]'::jsonb)
  );
end $$;
select private.expose('public.market_overview()');
