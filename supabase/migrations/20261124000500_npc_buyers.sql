-- 0.0.11 (owner request): NPC buyers for the cards players sell. A card a player lists on the Cardmarket is bought by
-- an NPC collector after a wait that depends on its price against the Marktwert when it is listed
-- (market.npc_buy_steps: up to 100 % after 1-2 minutes, up to 115 % after 10-20 minutes, up to 130 % after 12-24 hours;
-- dearer cards wait for players). In the Kleinanzeigen the same wait brings a collector's offer at the full asking
-- price, which the player accepts or not. These buyers are the market itself, so NPC budgets do not limit them.
-- Collectors no longer pick cheap card listings on their own; Stammkunden (npc_trust) halves the waits.
-- The tick now runs a system when its interval is due within five seconds, so "every minute" survives cron jitter.

alter table game.listings add column npc_buy_at timestamptz;
create index listings_npc_buy_at on game.listings (npc_buy_at) where npc_buy_at is not null;
alter table game.ads add column npc_offer_at timestamptz;
create index ads_npc_offer_at on game.ads (npc_offer_at) where npc_offer_at is not null;

-- The wait for an NPC buyer at this price against the Marktwert, or null when none comes.
create function private.npc_buy_wait(p_seller uuid, p_value bigint, p_price bigint) returns interval
language plpgsql volatile set search_path = '' as $$
declare
  s jsonb;
begin
  if coalesce(p_value, 0) <= 0 or coalesce(p_price, 0) <= 0 then
    return null;
  end if;
  for s in select value from jsonb_array_elements(private.cfg('market.npc_buy_steps')) loop
    if p_price * 100 <= p_value * (s ->> 'max_pct')::numeric then
      return make_interval(secs => ((s ->> 'min_s')::numeric + private.rand() * ((s ->> 'max_s')::numeric - (s ->> 'min_s')::numeric))
        * case when private.stat(p_seller, 'npc_trust', 0) > 0 then 0.5 else 1 end);
    end if;
  end loop;
  return null;
end $$;

create function private.on_listing_npc_buyer() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.seller_id is not null and new.item_kind in ('card', 'copy') then
    new.npc_buy_at := private.now() + private.npc_buy_wait(new.seller_id, private.listing_value(new), new.price_cents);
  end if;
  return new;
end $$;
create trigger listings_npc_buyer before insert on game.listings for each row execute function private.on_listing_npc_buyer();

-- An ad's asking price is for the whole lot.
create function private.on_ad_npc_buyer() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.seller_id is not null and new.item_kind in ('card', 'copy') then
    new.npc_offer_at := private.now() + private.npc_buy_wait(new.seller_id,
      case when new.item_kind = 'copy' then private.copy_value(new.copy_id) else private.card_or_product_value(new.item_id) * new.qty end,
      new.ask_cents);
  end if;
  return new;
end $$;
create trigger ads_npc_buyer before insert on game.ads for each row execute function private.on_ad_npc_buyer();

-- The collector takes the whole listing at its price; the seller is paid when the parcel arrives, as with any sale.
create function private.npc_take_listing(p_listing bigint) returns void
language plpgsql set search_path = '' as $$
declare
  l game.listings;
  v_npc game.npcs;
begin
  select * into l from game.listings where id = p_listing and npc_buy_at <= private.now() for update skip locked;
  if not found then
    return;
  end if;
  select * into v_npc from game.npcs where archetype = 'collector' order by id limit 1;
  delete from game.listings where id = l.id;
  perform private.sale_ship(l.seller_id, null, null, v_npc.id, l.item_kind, l.item_id, l.copy_id, l.qty, l.price_cents * l.qty);
  perform private.notify(l.seller_id, 'npc_bought',
    jsonb_build_object('name', v_npc.name, 'item_id', l.item_id, 'qty', l.qty, 'cents', l.price_cents * l.qty));
end $$;

-- The collector offers the full asking price in the Kleinanzeigen.
create function private.ad_full_offer(p_ad bigint) returns void
language plpgsql set search_path = '' as $$
declare
  a game.ads;
  v_npc game.npcs;
begin
  update game.ads set npc_offer_at = null where id = p_ad and npc_offer_at <= private.now() returning * into a;
  if not found then
    return;
  end if;
  select * into v_npc from game.npcs where archetype = 'collector' order by id limit 1;
  insert into game.ad_offers (ad_id, npc_id, price_cents, state, reply_kind, reply_idx, created_at)
  values (a.id, v_npc.id, a.ask_cents, 'open', 'full', floor(private.rand() * 1000)::int, private.now());
  perform private.notify(a.seller_id, 'ad_offer', jsonb_build_object('item_id', a.item_id, 'name', v_npc.name, 'cents', a.ask_cents));
end $$;

create function private.tick_npc_buyers() returns void
language plpgsql set search_path = '' as $$
declare
  v_id bigint;
begin
  for v_id in select id from game.listings where npc_buy_at <= private.now() order by npc_buy_at loop
    begin
      perform private.npc_take_listing(v_id);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('npc_buyers', private.now(), 0, false, sqlerrm);
    end;
  end loop;
  for v_id in select id from game.ads where npc_offer_at <= private.now() order by npc_offer_at loop
    begin
      perform private.ad_full_offer(v_id);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('npc_buyers', private.now(), 0, false, sqlerrm);
    end;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('npc_buyers', 60);

-- listings and ads that are already up get their buyer from now on
update game.listings l set npc_buy_at = private.now() + private.npc_buy_wait(l.seller_id, private.listing_value(l), l.price_cents)
where l.seller_id is not null and l.item_kind in ('card', 'copy');
update game.ads a set npc_offer_at = private.now() + private.npc_buy_wait(a.seller_id,
  case when a.item_kind = 'copy' then private.copy_value(a.copy_id) else private.card_or_product_value(a.item_id) * a.qty end, a.ask_cents)
where a.seller_id is not null and a.item_kind in ('card', 'copy');


create or replace function private.npc_act(n game.npcs) returns void
language plpgsql set search_path = '' as $$
declare
  p jsonb := n.params;
  r record;
  i int;
  v_hit boolean;
  v_hype numeric;
begin
  if private.rand() * 100 >= n.activity then
    return;
  end if;

  if n.archetype = 'collector' then
    perform private.npc_orders_expire(n.id, interval '24 hours');
    for i in 1 .. greatest(0, (p ->> 'orders')::int - (select count(*) from game.buy_orders where npc_id = n.id)::int) loop
      select pr.item_id, pr.value_cents into r from game.prices pr join game.set_defs s on s.id = pr.set_id
      where pr.kind = 'card' and s.phase not in ('announced', 'preorder') order by private.rand() limit 1;
      perform private.npc_order(n.id, r.item_id, 1, round(r.value_cents * (p ->> 'orderPct')::numeric / 100)::bigint);
    end loop;

  elsif n.archetype = 'dealer' then
    delete from game.listings where npc_id = n.id and created_at < private.now() - make_interval(hours => (p ->> 'maxAgeH')::int);
    for i in 1 .. greatest(0, (p ->> 'stock')::int - (select count(*) from game.listings where npc_id = n.id)::int) loop
      v_hit := private.rand() * 100 < (p ->> 'hitChancePct')::numeric;
      select pr.item_id, pr.value_cents into r
      from game.prices pr join game.card_defs c on c.id = pr.item_id join game.set_defs s on s.id = c.set_id
      where s.phase not in ('announced', 'preorder')
        and ((v_hit and c.tier in ('holo', 'alternative', 'ultra', 'grail')) or (not v_hit and c.tier in ('common', 'uncommon', 'rare')))
      order by private.rand() limit 1;
      perform private.npc_list(n.id, r.item_id, case when v_hit then 1 else 1 + floor(private.rand() * 3)::int end,
        round(r.value_cents * ((p ->> 'markupMinPct')::numeric + private.rand() * ((p ->> 'markupMaxPct')::numeric - (p ->> 'markupMinPct')::numeric)) / 100)::bigint);
    end loop;

  elsif n.archetype = 'bulk' then
    perform private.npc_orders_expire(n.id, interval '24 hours');
    for i in 1 .. greatest(0, (p ->> 'orders')::int - (select count(*) from game.buy_orders where npc_id = n.id)::int) loop
      select pr.item_id, pr.value_cents into r
      from game.prices pr join game.card_defs c on c.id = pr.item_id join game.set_defs s on s.id = c.set_id
      where c.tier in ('common', 'uncommon') and s.phase not in ('announced', 'preorder') order by private.rand() limit 1;
      perform private.npc_order(n.id, r.item_id, (p ->> 'qty')::int, round(r.value_cents * (p ->> 'orderPct')::numeric / 100)::bigint);
    end loop;

  elsif n.archetype = 'scalper' then
    perform private.npc_buy_cheap(n.id, array['sealed'], (p ->> 'buyBelowPct')::numeric, 3);
    perform private.npc_sell_stock(n.id, (p ->> 'markupMinPct')::numeric, (p ->> 'markupMaxPct')::numeric);

  elsif n.archetype = 'investor' then
    select avg(hype) into v_hype from game.market;
    if v_hype * 100 < (p ->> 'buyHypeBelowPct')::numeric then
      perform private.npc_buy_cheap(n.id, array['sealed'], (p ->> 'buyBelowPct')::numeric, 3);
    elsif v_hype * 100 > (p ->> 'sellHypeAbovePct')::numeric then
      perform private.npc_sell_stock(n.id, (p ->> 'sellMarkupPct')::numeric, (p ->> 'sellMarkupPct')::numeric);
    end if;
  end if;
end $$;

create or replace function public.ad_answer(p_request_id uuid, p_offer bigint, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'ad_answer');
  o game.ad_offers;
  a game.ads;
  v_npc game.npcs;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select o2.* into o from game.ad_offers o2 join game.ads a2 on a2.id = o2.ad_id
  where o2.id = p_offer and a2.seller_id = v_player and o2.state = 'open' for update of o2;
  if not found then
    perform private.fail('not_found');
  end if;
  if not coalesce(p_accept, false) then
    update game.ad_offers set state = 'declined' where id = o.id;
    return private.request_done(v_player, p_request_id, jsonb_build_object('ads', private.ads_doc(v_player), 'player', private.me(v_player)));
  end if;
  select * into a from game.ads where id = o.ad_id for update;
  -- a full-price offer (0.0.11) comes from the market's own buyer: no budget needed
  if o.reply_kind = 'full' then
    select * into v_npc from game.npcs where id = o.npc_id;
  else
    update game.npcs set budget_cents = budget_cents - o.price_cents where id = o.npc_id and budget_cents >= o.price_cents
    returning * into v_npc;
  end if;
  if not found then
    update game.ad_offers set state = 'declined' where id = o.id;
    return private.request_done(v_player, p_request_id, jsonb_build_object('ads', private.ads_doc(v_player), 'player', private.me(v_player),
      'broke', true));
  end if;
  if a.item_kind = 'copy' then
    delete from game.card_copies where id = a.copy_id;
  else
    insert into game.npc_stock (npc_id, item_id, qty) values (v_npc.id, a.item_id, a.qty)
    on conflict (npc_id, item_id) do update set qty = game.npc_stock.qty + excluded.qty;
  end if;
  perform private.ad_close(a.id, false);
  perform private.money_add(v_player, o.price_cents, 'kleinanzeigen', a.item_id);
  perform private.ep_grant(v_player, private.cfg_num('ep.sale'));
  if a.item_kind <> 'sealed' then
    perform private.emit(v_player, 'cards_sold', a.qty);
  end if;
  if v_npc.archetype = 'kid' and private.rand() * 100 < private.cfg_num('ads.chargeback_pct') then
    insert into game.chargebacks (player_id, cents, due_at)
    values (v_player, o.price_cents, private.now() + make_interval(mins => (30 + private.rand() * 90)::int));
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object('ads', private.ads_doc(v_player), 'player', private.me(v_player)));
end $$;

create or replace function private.my_market_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'listings', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'item_kind', l.item_kind, 'item_id', l.item_id,
      'qty', l.qty, 'price_cents', l.price_cents, 'value_cents', private.listing_value(l), 'slab', private.slab_of(l.copy_id),
      'npc_buy_at', l.npc_buy_at)
      order by l.created_at desc)
      from game.listings l where l.seller_id = p_player), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'item_kind', item_kind, 'item_id', item_id,
      'qty', qty, 'price_cents', price_cents, 'value_cents', private.card_or_product_value(item_id)) order by created_at desc)
      from game.buy_orders where buyer_id = p_player), '[]'::jsonb),
    'parcels', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'item_id', item_id, 'qty', qty,
      'total_cents', total_cents, 'payout_cents', total_cents - fee_cents, 'arrives_at', arrives_at,
      'incoming', buyer_id is not distinct from p_player) order by arrives_at)
      from game.shipments where buyer_id = p_player or seller_id = p_player), '[]'::jsonb),
    'slots', private.market_slots(p_player),
    'used', (select count(*) from game.listings where seller_id = p_player) + (select count(*) from game.buy_orders where buyer_id = p_player)
  )
$$;

create or replace function public.limits_get(p_target uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object(
    'market_min_pct', private.cfg_num('market.player_min_pct')::int,
    'market_max_pct', private.cfg_num('market.player_max_pct')::int,
    'company_min_pct', private.cfg_num('company.price_min_pct')::int,
    'company_max_pct', private.cfg_num('company.price_max_pct')::int,
    'npc_buy_steps', (
      select jsonb_agg(jsonb_build_object('max_pct', (step ->> 'max_pct')::numeric,
        'min_s', (step ->> 'min_s')::numeric * case when private.stat(v_player, 'npc_trust', 0) > 0 then 0.5 else 1 end,
        'max_s', (step ->> 'max_s')::numeric * case when private.stat(v_player, 'npc_trust', 0) > 0 then 0.5 else 1 end))
      from jsonb_array_elements(private.cfg('market.npc_buy_steps')) as s(step)),
    'packs_today', private.daily_get(v_player, 'packs'),
    'pack_ep_cap', private.cfg_num('ep.pack_daily_cap')::int,
    'receive_left_cents', private.receive_left(v_player),
    'target', case when p_target is not null and p_target <> v_player and exists (select 1 from game.players where id = p_target)
      then jsonb_build_object(
        'loan_max_cents', private.loan_max_cents(p_target),
        'loan_active', exists (select 1 from game.loans where borrower_id = p_target and state = 'active'),
        'receive_left_cents', private.receive_left(p_target),
        'helps_left', greatest(0, private.cfg_num('help.max_received')::int
          - (select count(*) from game.friend_acts where target_id = p_target and kind = 'aushelfen' and day = private.today())::int))
      end
  );
end $$;

create or replace function private.tick() returns jsonb
language plpgsql set search_path = '' as $$
declare
  s game.tick_systems;
  v_now timestamptz := private.now();
  v_start timestamptz;
  v_ran int := 0;
  v_failed int := 0;
begin
  if not pg_try_advisory_xact_lock(7741001) then
    return jsonb_build_object('skipped', true);
  end if;

  for s in
    select * from game.tick_systems
    where enabled and (last_run_at is null or last_run_at + make_interval(secs => every_seconds) <= v_now + interval '5 seconds')
    order by name
  loop
    v_start := clock_timestamp();
    begin
      execute format('select private.%I()', 'tick_' || s.name);
      insert into game.job_runs (name, started_at, ms, ok)
      values (s.name, v_now, (extract(epoch from clock_timestamp() - v_start) * 1000)::int, true);
    exception when others then
      v_failed := v_failed + 1;
      insert into game.job_runs (name, started_at, ms, ok, error)
      values (s.name, v_now, (extract(epoch from clock_timestamp() - v_start) * 1000)::int, false, sqlerrm);
    end;
    update game.tick_systems set last_run_at = v_now where name = s.name;
    v_ran := v_ran + 1;
  end loop;

  return jsonb_build_object('ran', v_ran, 'failed', v_failed);
end $$;
