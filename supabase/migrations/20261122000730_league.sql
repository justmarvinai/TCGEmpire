-- alpha_07 (Leben), part 4: more toplists and the Wochenwertung (docs/GAME_DESIGN.md §21). New lists: Ruf, Bester
-- Pull (the most valuable card a player ever pulled, at its value then), Pechvogel (20-pack dry streaks) and the
-- Wochenwertung: net worth growth since Monday 00:00 in percent, so latecomers can win. Value that moves between
-- players through gifts and trades does not count. When a week ends, the best three players get reward boosters
-- and a trophy on their profile. Player rows carry their look.

alter table game.players
  add column best_pull_card text references game.card_defs (id),
  add column best_pull_cents bigint not null default 0;
create index players_best_pull_card on game.players (best_pull_card);

create table game.league (
  week date not null,
  player_id uuid not null references game.players (id) on delete cascade,
  start_cents bigint not null,
  -- value given away to other players minus value received from them this week (gifts, trades)
  adjust_cents bigint not null default 0,
  final_bps int,
  rank int,
  primary key (week, player_id)
);
create index league_player on game.league (player_id);
alter table game.league enable row level security;

-- A reset starts the running week over (past trophies stay).
create function private.on_player_reset_league() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.league where player_id = new.id and final_bps is null;
    update game.players set best_pull_card = null, best_pull_cents = 0 where id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_league after update of reset_at on game.players
  for each row execute function private.on_player_reset_league();

-- ---------------------------------------------------------------------------------------------
-- Bester Pull: remembered when a card comes out of a pack
-- ---------------------------------------------------------------------------------------------
create or replace function private.give_card(p_player uuid, p_card text) returns jsonb
language plpgsql set search_path = '' as $$
declare
  c game.card_defs;
  v_copy uuid;
  v_new boolean;
  v_value bigint := private.card_value(p_card);
  -- greasy fingers from a Döner make the surface of fresh hits worse
  v_grease int := case when private.stat(p_player, 'fettfinger', 0) > 0 then 2 else 0 end;
begin
  select * into c from game.card_defs where id = p_card;
  if c.tier in ('holo', 'alternative', 'ultra', 'grail') then
    insert into game.card_copies (owner_id, card_id, q_centering, q_corners, q_edges, q_surface, pulled_at)
    values (p_player, p_card, private.roll_quality(), private.roll_quality(), private.roll_quality(),
            greatest(1, private.roll_quality() - v_grease), private.now())
    returning id into v_copy;
  else
    insert into game.card_stacks (player_id, card_id, qty) values (p_player, p_card, 1)
    on conflict (player_id, card_id) do update set qty = game.card_stacks.qty + 1;
  end if;
  insert into game.collection (player_id, card_id, first_at) values (p_player, p_card, private.now())
  on conflict do nothing;
  v_new := found;
  if c.tier in ('ultra', 'grail') then
    perform private.emit(p_player, 'pulled_' || c.tier);
  end if;
  update game.players set best_pull_card = p_card, best_pull_cents = v_value
  where id = p_player and best_pull_cents < v_value;
  return jsonb_build_object(
    'card_id', p_card, 'tier', c.tier, 'kind', c.kind,
    'value_cents', v_value, 'new', v_new, 'copy_id', v_copy
  );
end $$;

-- ---------------------------------------------------------------------------------------------
-- Wochenwertung
-- ---------------------------------------------------------------------------------------------
-- Gifts and trades: the giver's growth is not hurt, the receiver's is not helped.
create or replace function private.goods_move(p_from uuid, p_to uuid, p_goods jsonb, p_reason text) returns void
language plpgsql set search_path = '' as $$
declare
  v_money bigint := (p_goods ->> 'money_cents')::bigint;
  v_value bigint := private.goods_value(p_goods);
  i jsonb;
begin
  update game.league set adjust_cents = adjust_cents + v_value where week = private.week_start() and player_id = p_from;
  update game.league set adjust_cents = adjust_cents - v_value where week = private.week_start() and player_id = p_to;
  if v_money > 0 then
    perform private.money_add(p_from, -v_money, p_reason, p_to::text);
    perform private.money_add(p_to, v_money, p_reason, p_from::text);
  end if;
  for i in select * from jsonb_array_elements(p_goods -> 'items') loop
    perform private.item_take(p_from, i ->> 'kind', i ->> 'item_id', (i ->> 'copy_id')::uuid, (i ->> 'qty')::int, 'inventory');
    perform private.item_give(p_to, i ->> 'kind', i ->> 'item_id', (i ->> 'copy_id')::uuid, (i ->> 'qty')::int);
  end loop;
end $$;

-- Growth since the start of the week in basis points (small fortunes count as at least the minimum base).
create function private.league_bps(l game.league) returns int
language sql stable set search_path = '' as $$
  select round((private.net_worth(l.player_id) + l.adjust_cents - l.start_cents) * 10000.0
               / greatest(l.start_cents, private.eur(private.cfg_num('league.min_base_base_cents'))))::int
$$;

-- Hourly: close finished weeks (ranks, boosters for the best three, a headline), open the running week for
-- every player who has no row yet.
create function private.tick_league() returns void
language plpgsql set search_path = '' as $$
declare
  v_week date;
  r record;
  v_rewards jsonb := private.cfg('league.rewards');
begin
  for v_week in select distinct week from game.league where week < private.week_start() and final_bps is null loop
    update game.league l set final_bps = private.league_bps(l) where l.week = v_week;
    update game.league l set rank = x.rank
    from (select player_id, row_number() over (order by final_bps desc, start_cents) as rank from game.league where week = v_week) x
    where l.week = v_week and l.player_id = x.player_id;
    for r in select l.player_id, l.rank, l.final_bps from game.league l where l.week = v_week and l.rank <= jsonb_array_length(v_rewards) order by l.rank loop
      begin
        perform private.sealed_add(r.player_id, 'reward-booster', (v_rewards ->> (r.rank - 1))::int);
        perform private.notify(r.player_id, 'league_done', jsonb_build_object('rank', r.rank, 'bps', r.final_bps,
          'boosters', (v_rewards ->> (r.rank - 1))::int));
        perform private.emit(r.player_id, 'league_podium');
        if r.rank = 1 then
          perform private.emit(r.player_id, 'league_won');
          perform private.feed_add('league', jsonb_build_object('name', (select username from game.players where id = r.player_id), 'bps', r.final_bps));
        end if;
      exception when others then
        insert into game.job_runs (name, started_at, ms, ok, error) values ('league', private.now(), 0, false, sqlerrm);
      end;
    end loop;
  end loop;
  insert into game.league (week, player_id, start_cents)
  select private.week_start(), p.id, private.net_worth(p.id) from game.players p
  on conflict (week, player_id) do nothing;
end $$;
insert into game.tick_systems (name, every_seconds) values ('league', 3600);

-- ---------------------------------------------------------------------------------------------
-- Toplists (replaces the alpha_04 version)
-- ---------------------------------------------------------------------------------------------
-- NPC rivals' Ruf grows slowly with their level.
create function private.rival_ruf(r game.rivals, p_days numeric) returns int
language sql immutable set search_path = '' as $$
  select least(1000, 300 + r.start_level * 6 + floor(p_days * 4))::int
$$;

create or replace function public.toplist_get(p_list text, p_npcs boolean) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_days numeric := private.world_days();
  v_cards int := (select count(*) from game.card_defs);
  v_rivals boolean := coalesce(p_npcs, true) and p_list in ('worth', 'level', 'cash', 'collection', 'ruf');
  v_rows jsonb;
begin
  if p_list is null or p_list not in ('worth', 'level', 'cash', 'collection', 'ruf', 'best_pull', 'pechvogel', 'league') then
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

-- Trophies on the profile: podium places of finished weeks, and the best pull.
create function private.trophies_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'gold', count(*) filter (where rank = 1),
    'silver', count(*) filter (where rank = 2),
    'bronze', count(*) filter (where rank = 3),
    'best_pull_card', (select best_pull_card from game.players where id = p_player),
    'best_pull_cents', (select best_pull_cents from game.players where id = p_player)
  )
  from game.league where player_id = p_player and final_bps is not null
$$;

create or replace function public.profile_get(p_player uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := private.require_player();
  p game.players;
begin
  select * into p from game.players where id = coalesce(p_player, v_me);
  if not found then
    perform private.fail('not_found');
  end if;
  return jsonb_build_object(
    'id', p.id,
    'name', p.username,
    'title', p.title,
    'level', p.level,
    'net_worth_cents', private.net_worth(p.id),
    'created_at', p.created_at,
    'me', p.id = v_me,
    'look', private.look(p),
    'vitrine', private.vitrine_doc(p.id),
    'slots', private.vitrine_slots(p.id),
    'unlocked', p.level >= private.cfg_num('unlock.grading'),
    'stats', jsonb_build_object(
      'pack_opened', coalesce((select total from game.counters where player_id = p.id and event = 'pack_opened'), 0),
      'graded', coalesce((select total from game.counters where player_id = p.id and event = 'graded'), 0),
      'graded_10', coalesce((select total from game.counters where player_id = p.id and event = 'graded_10'), 0),
      'collection', private.collection_count(p.id)
    ),
    'trophies', private.trophies_doc(p.id),
    'home', jsonb_build_object(
      'tier', private.home_tier(p.id),
      'wohnwert', private.wohnwert(p.id),
      'furnishings', coalesce((select jsonb_object_agg(f.slot, f.item) from game.furnishings f where f.player_id = p.id), '{}'::jsonb)
    ),
    'guestbook', private.guestbook_doc(p.id),
    'signed_today', (select count(*) from game.guestbook where host_id = p.id and author_id = v_me
                     and (at at time zone 'Europe/Berlin')::date = private.today()) >= private.cfg_num('guestbook.per_day')
  );
end $$;
