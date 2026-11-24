-- 0.0.5: Empiremon, the game's own TCG (docs/GAME_DESIGN.md §4.6, decision 120). Its sets are house sets: always in
-- print, sold only at the kiosk, no licence needed, and their own odds (pack.house_hit_odds_ppm: Ultra and Grail far
-- rarer, otherwise the hit slot is a Common; no God Pack, Doppel-Hit or Pech-Schutz).

alter table game.set_defs add column house boolean not null default false;

-- A house set never leaves print.
create function private.on_set_house() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.house and new.phase <> 'print' then
    perform private.fail('invalid_request');
  end if;
  return new;
end $$;
create trigger set_defs_house before insert or update on game.set_defs
  for each row execute function private.on_set_house();

-- Tier of a hit slot. House sets roll the house odds; the rest of the slot is a Common.
create or replace function private.roll_hit_tier(p_player uuid, p_set text, p_min_holo boolean) returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_house boolean := coalesce((select house from game.set_defs where id = p_set), false);
  o jsonb := private.cfg(case when v_house then 'pack.house_hit_odds_ppm' else 'pack.hit_odds_ppm' end);
  v_luck numeric := least(1.5, 1 + private.stat(p_player, 'pack_luck', 0) / 100);
  v_dry int := coalesce((select dry from game.pity where player_id = p_player and set_id = p_set), 0);
  v_grail numeric := coalesce((o ->> 'grail')::numeric, 0) * v_luck;
  v_ultra numeric := coalesce((o ->> 'ultra')::numeric, 0) * v_luck;
  v_alt numeric := coalesce((o ->> 'alternative')::numeric, 0) * v_luck;
  v_holo numeric := case when v_house then 0 else (o ->> 'holo')::numeric
    + greatest(0, v_dry - private.cfg_num('pack.pity_after') + 1) * private.cfg_num('pack.pity_step_ppm') end;
  r numeric;
begin
  r := private.rand() * case when p_min_holo then v_grail + v_ultra + v_alt + v_holo else 1000000 end;
  if r < v_grail then return 'grail'; end if;
  r := r - v_grail;
  if r < v_ultra then return 'ultra'; end if;
  r := r - v_ultra;
  if r < v_alt then return 'alternative'; end if;
  r := r - v_alt;
  if r < v_holo then return 'holo'; end if;
  return case when v_house then 'common' else 'rare' end;
end $$;

-- The card ids of one booster. House sets have no God Pack and no Doppel-Hit (the rolls stay in place, so the other
-- sets roll exactly as before).
create or replace function private.roll_pack_cards(p_player uuid, p_product text) returns text[]
language plpgsql volatile set search_path = '' as $$
declare
  v_set text;
  v_slots jsonb;
  v_house boolean;
  g jsonb;
  v_pool text;
  v_n int;
  v_ids text[] := '{}';
  v_pick text[];
  v_god boolean := private.rand() * 1000000
    < private.cfg_num('pack.god_pack_ppm') * (1 + private.stat(p_player, 'god_pack_mult', 0));
  v_double boolean := private.rand() * 1000000 < private.cfg_num('pack.double_hit_ppm');
  i int;
begin
  select pd.set_id, pd.slots, s.house into v_set, v_slots, v_house
  from game.product_defs pd join game.set_defs s on s.id = pd.set_id where pd.id = p_product;
  if v_house then
    v_god := false;
    v_double := false;
  end if;
  for g in select * from jsonb_array_elements(v_slots) loop
    v_pool := g ->> 'pool';
    v_n := (g ->> 'n')::int;
    if v_god or v_pool = 'hit' then
      for i in 1 .. v_n loop
        v_ids := v_ids || private.pick_card(v_set, private.roll_hit_tier(p_player, v_set, v_god), v_ids);
      end loop;
    else
      if v_double and v_pool = 'uncommon' then
        v_n := v_n - 1;
      end if;
      select array_agg(id) into v_pick from (
        select id from game.card_defs
        where set_id = v_set
          and id <> all (v_ids)
          and case v_pool
                when 'energy' then tier = 'common' and kind = 'energy'
                when 'common' then tier = 'common' and kind <> 'energy'
                else tier = v_pool
              end
        order by private.rand()
        limit v_n
      ) s;
      v_ids := v_ids || coalesce(v_pick, '{}');
      if v_double and v_pool = 'uncommon' then
        v_ids := v_ids || private.pick_card(v_set, 'holo', v_ids);
      end if;
    end if;
  end loop;
  return v_ids;
end $$;

-- Pechvogel counts dry streaks of the normal odds only (an Empiremon booster is nearly always "dry").
create or replace function private.on_pity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.dry = 20 and not exists (select 1 from game.set_defs where id = new.set_id and house) then
    perform private.emit(new.player_id, 'pechvogel');
  end if;
  return new;
end $$;

-- Everybody may sell a house game; it cannot be picked as the starter or bought as a licence.
create or replace function private.has_license(p_player uuid, p_game text) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from game.licenses where player_id = p_player and game = p_game)
      or exists (select 1 from game.set_defs where game = p_game and house)
$$;

create or replace function public.starter_pick(p_request_id uuid, p_game text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'starter_pick');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform 1 from game.players where id = v_player for update;
  if not exists (select 1 from game.set_defs where game = p_game and not house)
     or exists (select 1 from game.licenses where player_id = v_player) then
    perform private.fail('invalid_request');
  end if;
  insert into game.licenses (player_id, game, at) values (v_player, p_game, private.now());
  update game.players set fav_game = p_game where id = v_player;
  perform private.emit(v_player, 'starter_picked');
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'licenses', private.licenses_doc(v_player), 'player', private.me(v_player)));
end $$;

-- New-card quests: house sets are open to everybody.
create or replace function private.quest_doable(p_player uuid, p_event text) returns boolean
language sql stable set search_path = '' as $$
  select case p_event
    when 'card_new' then exists (
      select 1 from game.card_defs c
      join game.set_defs s on s.id = c.set_id and s.phase in ('print', 'last_wave')
      where (s.house or exists (select 1 from game.licenses l where l.player_id = p_player and l.game = s.game))
        and not exists (select 1 from game.collection x where x.player_id = p_player and x.card_id = c.id))
    when 'upgrade_bought' then exists (
      select 1 from game.upgrade_defs d where private.upgrade_level(p_player, d.key) < d.max_level)
    else true
  end
$$;

-- Only the kiosk sells house boosters: no Pack Battles with them, no NPC classifieds selling them.
create or replace function public.battles_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.battles')::int,
    'round_seconds', private.cfg_num('battle.round_seconds')::int,
    'boosters', (select jsonb_agg(jsonb_build_object('product_id', d.id, 'price_cents', private.product_value(d.id)) order by d.id)
                 from game.product_defs d join game.set_defs s on s.id = d.set_id
                 where d.kind = 'booster' and s.phase not in ('announced', 'preorder') and not s.house),
    'open', coalesce((select jsonb_agg(private.battle_summary(b, v_player) order by b.created_at desc)
                      from game.battles b where b.state = 'open'), '[]'::jsonb),
    'running', coalesce((select jsonb_agg(private.battle_summary(b, v_player) order by b.started_at desc)
                         from game.battles b where b.state = 'running'), '[]'::jsonb),
    'done', coalesce((select jsonb_agg(x.s order by x.ends_at desc) from (
                        select private.battle_summary(b, v_player) as s, b.ends_at from game.battles b
                        where b.state = 'done' order by b.ends_at desc limit 10) x), '[]'::jsonb)
  );
end $$;

create or replace function public.battle_create(p_request_id uuid, p_mode text, p_product text, p_packs int, p_seats int) returns jsonb
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
                    where d.id = p_product and d.kind = 'booster' and s.phase not in ('announced', 'preorder') and not s.house) then
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

create or replace function private.ad_create_npc() returns void
language plpgsql set search_path = '' as $$
declare
  v_style text;
  v_roll numeric := private.rand() * 100;
  v_item text;
  v_kind text;
  v_value bigint;
  v_qty int;
  v_ask numeric;
  v_min numeric;
  v_risk text;
  v_hit boolean;
begin
  v_style := case when private.rand() < 0.35 then 'attic' when private.rand() < 0.62 then 'normal' else 'dreamer' end;
  if v_roll < private.cfg_num('ads.sealed_pct') then
    select d.id into v_item from game.product_defs d join game.set_defs s on s.id = d.set_id
    where d.kind = 'booster' and not s.house order by private.rand() limit 1;
    v_kind := 'sealed';
    v_qty := 1 + floor(private.rand() * 3)::int;
  else
    v_hit := private.rand() * 100 < private.cfg_num('ads.hit_pct');
    select id into v_item from game.card_defs
    where (v_hit and tier in ('holo', 'alternative', 'ultra', 'grail')) or (not v_hit and tier in ('common', 'uncommon', 'rare'))
    order by private.rand() limit 1;
    v_kind := 'card';
    v_qty := case when v_hit then 1 else 1 + floor(private.rand() * 4)::int end;
  end if;
  v_value := private.card_or_product_value(v_item) * v_qty;
  if v_style = 'attic' then
    v_ask := v_value * private.rand_between(0.4, 0.8);
    v_min := v_ask * private.rand_between(0.7, 0.9);
    v_risk := case when private.rand() * 100 < private.cfg_num('ads.attic_fake_pct') then 'fake'
                   when v_hit and private.rand() * 100 < private.cfg_num('ads.attic_knick_pct') then 'knick'
                   when private.rand() * 100 < private.cfg_num('ads.ghost_pct') then 'ghost' end;
  elsif v_style = 'normal' then
    v_ask := v_value * private.rand_between(0.9, 1.2);
    v_min := v_value * private.rand_between(0.8, 0.95);
    v_risk := case when private.rand() * 100 < private.cfg_num('ads.ghost_pct') then 'ghost' end;
  else
    v_ask := v_value * private.rand_between(1.5, 3);
    v_min := v_value * private.rand_between(1.05, 1.3);
  end if;
  insert into game.ads (npc_id, seller_idx, style, title_idx, item_kind, item_id, qty, ask_cents, min_cents, patience, risk,
                        created_at, expires_at)
  values (case when v_style = 'attic' then 'doris' end, floor(private.rand() * 1000)::int,
          v_style, floor(private.rand() * 1000)::int, v_kind, v_item, v_qty, greatest(1, round(v_ask)), greatest(1, round(least(v_min, v_ask))),
          2 + floor(private.rand() * 3)::int, v_risk, private.now(),
          private.now() + make_interval(hours => (private.cfg_num('ads.npc_hours') * private.rand_between(0.5, 1.5))::int));
end $$;
