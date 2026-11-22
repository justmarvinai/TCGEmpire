-- alpha_04 (Flip), part 6: net worth (docs/GAME_DESIGN.md §3) with an hourly history, and the toplists
-- (§21) Vermögen, Level, Bargeld and Sammlung. NPC rivals sit on the lists with numbers that grow from the
-- day the world started, so there is always somebody just ahead. Overtakes on the Vermögen list make the feed.

-- private.eur(null) returned the money cap (least() skips nulls); null in, null out from now on.
create or replace function private.eur(p_base_cents numeric) returns bigint
language sql stable strict set search_path = '' as $$
  select least(9000000000000000, round(p_base_cents * (select price_level from game.server where id)))::bigint
$$;

alter table game.server add column started_at timestamptz;
alter table game.server add column worth_ranking uuid[] not null default '{}';
update game.server set started_at = coalesce((select min(created_at) from game.players), private.now()) where id;

create table game.rivals (
  id text primary key,
  name text not null,
  start_base_cents bigint not null check (start_base_cents > 0),
  growth_pct numeric not null,
  start_level int not null,
  level_per_day numeric not null,
  start_collection_pct numeric not null
);

create table game.worth_snapshots (
  player_id uuid not null references game.players (id) on delete cascade,
  at timestamptz not null,
  worth_cents bigint not null,
  primary key (player_id, at)
);
create index worth_snapshots_at on game.worth_snapshots (at);

alter table game.rivals enable row level security;
alter table game.worth_snapshots enable row level security;

-- ---------------------------------------------------------------------------------------------
-- Net worth: cash, bunker content, cards and sealed at Marktwert wherever they are (binder, listed,
-- on the way, in an ad), money held in buy orders and sales on their way to the buyer.
-- ---------------------------------------------------------------------------------------------
create function private.net_worth(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select least(9000000000000000, (
      (select cash_cents from game.players where id = p_player)
    + coalesce(private.eur(private.bunker_content_base(p_player)), 0)
    + (select coalesce(sum(private.card_value(card_id) * qty), 0) from game.card_stacks where player_id = p_player)
    + (select coalesce(sum(private.card_value(card_id)), 0) from game.card_copies where owner_id = p_player)
    + (select coalesce(sum(private.product_value(product_id) * qty), 0) from game.sealed where player_id = p_player)
    + (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.listings
       where seller_id = p_player and item_kind <> 'copy')
    + (select coalesce(sum(price_cents * qty), 0) from game.buy_orders where buyer_id = p_player)
    + (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.shipments
       where buyer_id = p_player and item_kind <> 'copy')
    + (select coalesce(sum(total_cents - fee_cents), 0) from game.shipments where seller_id = p_player)
    + (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.ads
       where seller_id = p_player and item_kind <> 'copy')
  )::numeric)::bigint
$$;

-- Distinct cards a player owns right now (the Sammlung list).
create function private.collection_count(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select count(*)::int from (
    select card_id from game.card_stacks where player_id = p_player and qty > 0
    union
    select card_id from game.card_copies where owner_id = p_player
  ) x
$$;

-- Player document (replaces the alpha_03 version): net worth from private.net_worth.
create or replace function private.player_doc(r game.players) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id,
    'username', r.username,
    'title', r.title,
    'cash_cents', r.cash_cents,
    'level', r.level,
    'ep', r.ep,
    'ep_to_next', case when r.level < 100 then private.ep_to_next(r.level) end,
    'skill_points', r.skill_points,
    'ruf', r.ruf,
    'pfandbons', r.pfandbons,
    'energy', private.energy_now(r),
    'energy_max', private.energy_max(r.id),
    'energy_at', r.energy_at,
    'energy_regen_s', private.energy_regen_s(r.id),
    'prestige', r.prestige,
    'stars', r.stars,
    'is_admin', r.is_admin,
    'tutorial_step', r.tutorial_step,
    'sealed_total', (select coalesce(sum(qty), 0) from game.sealed where player_id = r.id),
    'net_worth_cents', private.net_worth(r.id),
    'quests_ready', (
      select count(*) from game.quests
      where player_id = r.id and claimed_at is null and progress >= target
        and (kind = 'mini' or (kind = 'daily' and period = private.today()) or (kind = 'weekly' and period = private.week_start()))
    ),
    'buffs', (
      select coalesce(jsonb_agg(jsonb_build_object('key', substr(source, 6), 'expires_at', expires_at) order by expires_at), '[]'::jsonb)
      from game.modifiers
      where player_id = r.id and source like 'buff:%' and expires_at > private.now()
    ),
    'created_at', r.created_at
  )
$$;

-- ---------------------------------------------------------------------------------------------
-- Rivals: pure functions of the days since the world started (no state, no tick)
-- ---------------------------------------------------------------------------------------------
create function private.world_days() returns numeric
language sql stable set search_path = '' as $$
  select greatest(0, extract(epoch from private.now() - coalesce(started_at, private.now())) / 86400)
  from game.server where id
$$;

create function private.rival_worth(r game.rivals, p_days numeric) returns bigint
language sql stable set search_path = '' as $$
  select private.eur(r.start_base_cents * least(1000, power(1 + r.growth_pct / 100, p_days)))
$$;

create function private.rival_level(r game.rivals, p_days numeric) returns numeric
language sql immutable set search_path = '' as $$
  select least(100, r.start_level + r.level_per_day * p_days)
$$;

-- ---------------------------------------------------------------------------------------------
-- Hourly snapshots: history for the chart (hourly for a week, then the last one per day) and
-- overtakes in the top ten of the Vermögen list for the feed (players only; rivals never make news).
-- ---------------------------------------------------------------------------------------------
create function private.tick_snapshots() returns void
language plpgsql set search_path = '' as $$
declare
  v_now timestamptz := private.now();
  v_old uuid[] := (select worth_ranking from game.server where id);
  v_new uuid[];
begin
  insert into game.worth_snapshots (player_id, at, worth_cents)
  select id, v_now, private.net_worth(id) from game.players
  on conflict do nothing;

  delete from game.worth_snapshots s
  where s.at < v_now - make_interval(days => private.cfg_num('snapshots.hourly_days')::int)
    and exists (
      select 1 from game.worth_snapshots n
      where n.player_id = s.player_id and n.at > s.at
        and (n.at at time zone 'Europe/Berlin')::date = (s.at at time zone 'Europe/Berlin')::date
    );

  select coalesce(array_agg(player_id order by worth_cents desc, player_id), '{}') into v_new
  from game.worth_snapshots where at = v_now;
  for i in 1 .. least(coalesce(array_length(v_new, 1), 0) - 1, 10) loop
    if array_position(v_old, v_new[i]) > array_position(v_old, v_new[i + 1]) then
      perform private.feed_add('overtake', jsonb_build_object(
        'name', (select username from game.players where id = v_new[i]),
        'other', (select username from game.players where id = v_new[i + 1]),
        'rank', i));
    end if;
  end loop;
  update game.server set worth_ranking = v_new where id;
end $$;

insert into game.tick_systems (name, every_seconds) values ('snapshots', 3600);

-- A reset starts the history from scratch.
create function private.on_player_reset_worth() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.worth_snapshots where player_id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_worth after update of reset_at on game.players
  for each row execute function private.on_player_reset_worth();

-- ---------------------------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------------------------

-- Home (replaces the alpha_03 version): latest hit, plus the net worth of the last 7 days (ending now)
-- and the value at the end of yesterday for "heute".
create or replace function public.home_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_now timestamptz := private.now();
  v_worth bigint := private.net_worth(v_player);
begin
  return jsonb_build_object(
    'last_hit', (
      select jsonb_build_object('card_id', c.card_id, 'tier', d.tier, 'value_cents', private.card_value(c.card_id), 'pulled_at', c.pulled_at)
      from game.card_copies c
      join game.card_defs d on d.id = c.card_id
      where c.owner_id = v_player
      order by c.pulled_at desc
      limit 1
    ),
    'worth', jsonb_build_object(
      'now_cents', v_worth,
      'history', (
        select coalesce(jsonb_agg(jsonb_build_array(extract(epoch from at)::bigint, worth_cents) order by at), '[]'::jsonb)
        from game.worth_snapshots where player_id = v_player and at > v_now - interval '7 days'
      ) || jsonb_build_array(jsonb_build_array(extract(epoch from v_now)::bigint, v_worth)),
      'day_open_cents', coalesce(
        (select worth_cents from game.worth_snapshots
         where player_id = v_player and at < (private.today()::timestamp at time zone 'Europe/Berlin')
         order by at desc limit 1),
        (select worth_cents from game.worth_snapshots where player_id = v_player order by at limit 1)
      )
    )
  );
end $$;

-- One toplist: the top rows plus the caller and whoever is directly ahead. With p_npcs = false the
-- rivals are left out and the ranks count players only.
create function public.toplist_get(p_list text, p_npcs boolean) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_days numeric := private.world_days();
  v_cards int := (select count(*) from game.card_defs);
  v_rows jsonb;
begin
  if p_list is null or p_list not in ('worth', 'level', 'cash', 'collection') then
    perform private.fail('invalid_request');
  end if;

  with board as (
    select 'player' as kind, p.id::text as id, p.username as name, p.title, p.level,
      case p_list
        when 'worth' then private.net_worth(p.id)::numeric
        when 'cash' then p.cash_cents::numeric
        when 'level' then p.level + case when p.level < 100 then p.ep::numeric / private.ep_to_next(p.level) else 0 end
        else private.collection_count(p.id)::numeric
      end as score
    from game.players p
    union all
    select 'npc', r.id, r.name, null, floor(private.rival_level(r, v_days))::int,
      case p_list
        when 'worth' then private.rival_worth(r, v_days)::numeric
        when 'cash' then round(private.rival_worth(r, v_days) * 0.3)
        when 'level' then private.rival_level(r, v_days)
        else floor(v_cards * least(0.97, (r.start_collection_pct + 1.5 * v_days) / 100))
      end
    from game.rivals r
    where coalesce(p_npcs, true)
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
    'me', r.kind = 'player' and r.id = v_player::text
  ) order by r.rank), '[]'::jsonb)
  into v_rows
  from ranked r cross join mine m
  where r.rank <= private.cfg_num('toplist.size') or r.rank between m.rank - 1 and m.rank;

  return jsonb_build_object('list', p_list, 'npcs', coalesce(p_npcs, true), 'cards_total', v_cards, 'rows', v_rows);
end $$;
select private.expose('public.toplist_get(text, boolean)');
