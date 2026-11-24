-- QA pass (24 Nov 2026), progression:
-- 1. Snacks bought at the kiosk give at most snack.daily_energy energy a day ("satt"). Unlimited Club-Mate made
--    minijobs an endless EP and money loop (about ten levels an hour at level 10); upgrades for energy stay worth it.
-- 2. New-card quests are only offered while at least ten common, uncommon or rare cards are still missing; quests that
--    waited for one lucky Ultra or Grail sat unfinished for days. Stuck ones are replaced.
-- 3. "Stempel diese Woche" asks 3-4 stamps (was 5-6): after weekly quests unlock mid-week, or after two missed days,
--    nobody could finish it.
-- 4. The kiosk sells 50 boosters at once and pack.max_open allows opening 50: the daily pack EP took about
--    80 clicks late in the game.


create or replace function public.consumable_use(p_request_id uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'consumable_use');
  d game.consumable_defs;
  r game.players;
  v_gain int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'consumable', 30, 60);
  select * into d from game.consumable_defs where key = p_key;
  if not found then
    perform private.fail('invalid_request');
  end if;
  select * into r from game.players where id = v_player for update;
  -- satt: kiosk snacks count the energy they really add (a full tank wastes it, as before); once today's limit is
  -- reached they are refused (the last one may go over it)
  if d.price_base_cents is not null and d.energy > 0 then
    v_gain := greatest(0, least(d.energy, private.energy_max(v_player) - private.energy_now(r)));
    if private.daily_bump(v_player, 'snack_energy', v_gain) - v_gain >= private.cfg_num('snack.daily_energy') then
      perform private.fail('snack_full');
    end if;
  end if;
  if d.price_base_cents is not null then
    perform private.money_add(v_player, -private.eur(d.price_base_cents), 'snack', p_key);
  end if;
  if d.pfandbons is not null then
    update game.players set pfandbons = pfandbons - d.pfandbons where id = v_player and pfandbons >= d.pfandbons;
    if not found then
      perform private.fail('not_enough_pfandbons');
    end if;
  end if;
  if d.energy > 0 then
    perform private.energy_change(v_player, d.energy);
  end if;
  if d.booster > 0 then
    perform private.sealed_add(v_player, private.cfg('level.reward_product') #>> '{}', d.booster);
  end if;
  if d.buff_stat is not null then
    insert into game.modifiers (player_id, source, stat, op, value, expires_at)
    values (v_player, 'buff:' || p_key, d.buff_stat, d.buff_op, d.buff_value, private.now() + make_interval(mins => d.buff_minutes))
    on conflict (player_id, source, stat) do update set op = excluded.op, value = excluded.value, expires_at = excluded.expires_at;
  end if;
  if d.price_base_cents is not null then
    perform private.emit(v_player, 'snack_eaten');
  end if;
  if p_key = 'doener' then
    perform private.emit(v_player, 'doener_eaten');
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object('player', private.me(v_player)));
end $$;

create or replace function public.shop_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_level int;
  v_ruf int;
begin
  select level, ruf into v_level, v_ruf from game.players where id = v_player;
  return jsonb_build_object(
    'kiosk', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'product_id', pd.id,
        'price_cents', private.kiosk_price(pd.id),
        'bought_today', coalesce((select sum(sp.qty) from game.store_purchases sp
          where sp.player_id = v_player and sp.store = 'kiosk' and sp.product_id = pd.id and sp.day = private.today()), 0),
        'daily_limit', private.cfg_num('kiosk.daily_limit')
      ) order by pd.id), '[]'::jsonb)
      from game.product_defs pd join game.set_defs s on s.id = pd.set_id
      where pd.kind = 'booster' and s.phase in ('print', 'last_wave')
    ),
    'stores', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', s.key,
        'min_level', s.min_level,
        'open', private.store_open(s.key),
        'shared', jsonb_array_length(s.restocks) > 0,
        'next_restock_at', private.store_next(s.key),
        'offers', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'product_id', pd.id,
            'min_level', coalesce((p ->> 'minLevel')::int, s.min_level),
            'price_cents', private.store_price(s.key, pd.id),
            'left', w.qty_left,
            'total', w.qty_total,
            'restocked_at', w.wave_at,
            'limit', case when jsonb_array_length(s.restocks) > 0 then s.lim else s.lim + s.lim_per_ruf100 * (v_ruf / 100) end,
            'bought', coalesce((select sum(b.qty) from game.store_buys b
              where b.player_id = v_player and b.store = s.key and b.product_id = pd.id
                and b.period_at = case when jsonb_array_length(s.restocks) > 0 then w.wave_at else private.week_start()::timestamptz end), 0)
          ) order by pd.price_base_cents), '[]'::jsonb)
          from jsonb_array_elements(s.products) p
          join game.product_defs pd on pd.id = p ->> 'id'
          join game.set_defs sd on sd.id = pd.set_id and sd.phase in ('print', 'last_wave')
          left join game.store_waves w on w.store = s.key and w.product_id = pd.id
        )
      ) order by s.min_level), '[]'::jsonb)
      from game.store_defs s
    ),
    'lager', jsonb_build_object('used', private.lager_used(v_player), 'cap', private.lager_cap(v_player),
                                'unlock_level', private.cfg_num('unlock.lager')),
    'sealed', (
      select coalesce(jsonb_agg(jsonb_build_object('product_id', product_id, 'qty', qty) order by product_id), '[]'::jsonb)
      from game.sealed where player_id = v_player and qty > 0
    ),
    'snack_energy_left', greatest(0, private.cfg_num('snack.daily_energy') - private.daily_get(v_player, 'snack_energy')),
    'snacks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', key,
        'price_cents', case when price_base_cents is not null then private.eur(price_base_cents) end,
        'pfandbons', pfandbons
      ) order by key), '[]'::jsonb)
      from game.consumable_defs
    )
  );
end $$;

create or replace function public.store_buy(p_request_id uuid, p_product text, p_qty int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'store_buy');
  v_price bigint;
  v_bought int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'buy', private.cfg_num('rate.buy')::int, 60);
  if p_qty is null or p_qty not in (1, 5, 10, 50) then
    perform private.fail('invalid_request');
  end if;
  if not exists (
    select 1 from game.product_defs pd join game.set_defs s on s.id = pd.set_id
    where pd.id = p_product and pd.kind = 'booster' and s.phase in ('print', 'last_wave')
  ) then
    perform private.fail('product_unavailable');
  end if;

  perform 1 from game.players where id = v_player for update;
  select coalesce(sum(qty), 0) into v_bought from game.store_purchases
  where player_id = v_player and store = 'kiosk' and product_id = p_product and day = private.today();
  if v_bought + p_qty > private.cfg_num('kiosk.daily_limit') then
    perform private.fail('store_limit');
  end if;
  perform private.lager_check(v_player, p_qty);

  v_price := private.kiosk_price(p_product);
  perform private.money_add(v_player, -v_price * p_qty, 'store_buy', p_product);
  insert into game.store_purchases (player_id, store, product_id, day, qty)
  values (v_player, 'kiosk', p_product, private.today(), p_qty)
  on conflict (player_id, store, product_id, day) do update set qty = game.store_purchases.qty + excluded.qty;
  perform private.sealed_add(v_player, p_product, p_qty);
  perform private.emit(v_player, 'packs_bought', p_qty);

  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'bought', p_qty, 'paid_cents', v_price * p_qty, 'player', private.me(v_player)));
end $$;

create or replace function private.quest_doable(p_player uuid, p_event text) returns boolean
language sql stable set search_path = '' as $$
  select case p_event
    when 'card_new' then (
      select count(*) >= 10 from game.card_defs c
      join game.set_defs s on s.id = c.set_id and s.phase in ('print', 'last_wave')
      where c.tier in ('common', 'uncommon', 'rare')
        and (s.house or exists (select 1 from game.licenses l where l.player_id = p_player and l.game = s.game))
        and not exists (select 1 from game.collection x where x.player_id = p_player and x.card_id = c.id))
    when 'energy_pulled' then exists (
      select 1 from game.card_defs c
      join game.set_defs s on s.id = c.set_id and s.phase in ('print', 'last_wave')
      where c.kind = 'energy'
        and (s.house or exists (select 1 from game.licenses l where l.player_id = p_player and l.game = s.game)))
    when 'upgrade_bought' then exists (
      select 1 from game.upgrade_defs d where private.upgrade_level(p_player, d.key) < d.max_level)
    else true
  end
$$;

-- "Stempel diese Woche" asks 3-4 stamps now (content/quests.ts); this week's open ones follow
update game.quests set target = 4 where template = 'w_stamps' and claimed_at is null and target > 4;

-- replace the new-card quests nobody can finish any more
do $$
declare
  v_player uuid;
begin
  for v_player in
    select distinct q.player_id from game.quests q
    where q.event = 'card_new' and q.claimed_at is null and q.progress < q.target
      and not private.quest_doable(q.player_id, 'card_new')
  loop
    delete from game.quests where player_id = v_player and event = 'card_new' and claimed_at is null and progress < target;
    perform private.quests_fill(v_player);
  end loop;
end $$;
