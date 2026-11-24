-- QA pass (24 Nov 2026): server fixes found in review, each with a regression test in supabase/tests/qa_fixes.test.ts.

-- "Doppelte verkaufen" sends every duplicate of every released set at once: more than 200 stacks is normal for a
-- collector, so the cap fits the whole catalog.
create or replace function public.ankauf_sell(p_request_id uuid, p_stacks jsonb, p_copies uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'ankauf_sell');
  v_rate numeric := private.ankauf_rate(v_player);
  e jsonb;
  v_n int;
  v_count int := 0;
  v_value numeric := 0;
  v_payout bigint;
  v_deleted int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'sell', private.cfg_num('rate.sell')::int, 60);
  if jsonb_typeof(coalesce(p_stacks, '[]')) <> 'array' or jsonb_array_length(coalesce(p_stacks, '[]')) > 2000
     or coalesce(array_length(p_copies, 1), 0) > 2000 then
    perform private.fail('invalid_request');
  end if;

  for e in select * from jsonb_array_elements(coalesce(p_stacks, '[]')) loop
    v_n := (e ->> 'qty')::int;
    if v_n is null or v_n < 1 then
      perform private.fail('invalid_request');
    end if;
    update game.card_stacks set qty = qty - v_n
    where player_id = v_player and card_id = e ->> 'card_id' and qty >= v_n;
    if not found then
      perform private.fail('not_owned');
    end if;
    v_value := v_value + private.card_value(e ->> 'card_id') * v_n;
    v_count := v_count + v_n;
  end loop;
  delete from game.card_stacks where player_id = v_player and qty = 0;

  -- Raw hits only: the Kartenladen does not buy slabs.
  if coalesce(array_length(p_copies, 1), 0) > 0 then
    with gone as (
      delete from game.card_copies
      where owner_id = v_player and id = any (p_copies) and location = 'inventory' and grader is null
      returning card_id
    )
    select count(*), coalesce(sum(private.card_value(card_id)), 0) into v_deleted, v_payout from gone;
    if v_deleted <> (select count(distinct x) from unnest(p_copies) x) then
      perform private.fail('not_owned');
    end if;
    v_value := v_value + v_payout;
    v_count := v_count + v_deleted;
  end if;

  if v_count = 0 then
    perform private.fail('invalid_request');
  end if;
  v_payout := round(v_value * v_rate / 10000);
  perform private.money_add(v_player, v_payout, 'ankauf');
  perform private.ep_grant(v_player, private.cfg_num('ep.sale'));
  perform private.emit(v_player, 'cards_sold', v_count);

  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'sold', v_count, 'payout_cents', v_payout, 'player', private.me(v_player)));
end $$;

-- Orders customers sent to the player's company block the exit only while they are still being graded: a customer
-- who never opens a finished slab must not lock the owner out of Prestige forever.
create or replace function private.prestige_blockers(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_object_agg(k, n) filter (where n > 0), '{}'::jsonb) from (values
    ('listings', (select count(*) from game.listings where seller_id = p_player)),
    ('buy_orders', (select count(*) from game.buy_orders where buyer_id = p_player)),
    ('shipments', (select count(*) from game.shipments where buyer_id = p_player or seller_id = p_player)),
    ('ads', (select count(*) from game.ads where seller_id = p_player)),
    ('grading', (select count(*) from game.grading_orders where player_id = p_player)),
    ('company_orders', (select count(*) from game.grading_orders o join game.companies c on o.grader = 'co:' || c.id
                        where c.owner_id = p_player and o.due_at > private.now())),
    ('loans', (select count(*) from game.loans where (lender_id = p_player or borrower_id = p_player) and state = 'active')),
    ('battles', (select count(*) from game.battle_seats s join game.battles b on b.id = s.battle_id
                 where s.player_id = p_player and b.state in ('open', 'running'))),
    ('breaks', (select count(*) from game.breaks b where b.state in ('open', 'running') and (b.host_id = p_player
                 or exists (select 1 from game.break_spots s where s.break_id = b.id and s.player_id = p_player)))),
    ('group_orders', (select count(*) from game.group_order_shares s join game.group_orders g on g.id = s.order_id
                      where s.player_id = p_player and g.state = 'open'))
  ) b(k, n)
$$;

-- Cancel first, refund only if this call cancelled it: a lobby that was started (or left) meanwhile is not refunded.
create or replace function private.battle_cancel(p_battle bigint) returns void
language plpgsql set search_path = '' as $$
declare
  s record;
begin
  update game.battles set state = 'cancelled' where id = p_battle and state = 'open';
  if not found then
    return;
  end if;
  for s in select * from game.battle_seats where battle_id = p_battle and player_id is not null and paid_cents > 0 loop
    perform private.money_add(s.player_id, s.paid_cents, 'battle_refund', p_battle::text);
  end loop;
end $$;

-- An NPC buyer that cannot pay any more: the offer is declined for good (a failed call rolled the decline back, so
-- the dead offer stayed and failed on every click). The answer says so instead of failing.
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
  update game.npcs set budget_cents = budget_cents - o.price_cents where id = o.npc_id and budget_cents >= o.price_cents
  returning * into v_npc;
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

-- Event cards and price targets come from released sets only (Vorbestellung is not out yet either).
create or replace function private.event_start(p_event bigint) returns void
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
      where d.tier in ('holo', 'alternative', 'ultra', 'grail') and s.phase not in ('announced', 'preorder') order by private.rand() limit 1;
      update game.prices set pressure = pressure * (eff -> 'pressure' ->> 'factor')::numeric where item_id = v_card;
      v_data := v_data || jsonb_build_object('card_id', v_card);
    else
      select id into v_set from game.set_defs where phase not in ('announced', 'preorder') order by private.rand() limit 1;
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
          and s.phase not in ('announced', 'preorder') and d.tier in ('common', 'uncommon', 'rare', 'holo')
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

-- A loan is looked at again under its lock: a repayment at the same moment cannot be charged twice.
create or replace function private.tick_loans() returns void
language plpgsql set search_path = '' as $$
declare
  l game.loans;
begin
  for l in select * from game.loans where state = 'active' and not reminded
           and due_at <= private.now() + make_interval(hours => private.cfg_num('loan.remind_hours')::int) loop
    update game.loans set reminded = true where id = l.id;
    perform private.notify(l.borrower_id, 'loan_due', jsonb_build_object('name', (select username from game.players where id = l.lender_id),
      'cents', private.loan_due(l), 'due_at', l.due_at));
  end loop;
  for l in select * from game.loans where state = 'active' and due_at <= private.now() order by due_at loop
    begin
      perform 1 from game.players where id in (l.lender_id, l.borrower_id) order by id for update;
      select * into l from game.loans where id = l.id and state = 'active' for update;
      if not found then
        continue;
      end if;
      if (select cash_cents from game.players where id = l.borrower_id) >= private.loan_due(l) then
        perform private.loan_close_repaid(l);
      else
        perform private.loan_default(l);
      end if;
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('loans', private.now(), 0, false, sqlerrm);
    end;
  end loop;
end $$;

-- Reset and delete must not cost anyone else: they wait for open loans (as borrower), pack battles and box breaks,
-- and parcels on their way to the player are delivered first so the sellers get paid.
create or replace function private.account_busy(p_player uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from game.loans where borrower_id = p_player and state = 'active')
      or exists (select 1 from game.battle_seats s join game.battles b on b.id = s.battle_id
                 where s.player_id = p_player and b.state in ('open', 'running'))
      or exists (select 1 from game.breaks b where b.state in ('open', 'running') and (b.host_id = p_player
                 or exists (select 1 from game.break_spots s where s.break_id = b.id and s.player_id = p_player)))
$$;

create or replace function public.account_reset(p_request_id uuid, p_confirm text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  r game.players;
begin
  select * into r from game.players where id = v_player for update;
  if lower(btrim(coalesce(p_confirm, ''))) <> r.username_key then
    perform private.fail('confirm_wrong');
  end if;
  if private.account_busy(v_player) then
    perform private.fail('account_busy');
  end if;
  perform private.shipment_deliver(s.id) from game.shipments s where s.buyer_id = v_player and s.seller_id is not null;
  if r.reset_at is not null and r.reset_at > private.now() - make_interval(hours => private.cfg_num('account.reset_cooldown_h')::int) then
    perform private.fail('reset_cooldown');
  end if;
  -- Everything goes: items are destroyed (they leave supply and collections), nothing is handed over.
  delete from game.card_stacks where player_id = v_player;
  delete from game.card_copies where owner_id = v_player;
  delete from game.sealed where player_id = v_player;
  delete from game.collection where player_id = v_player;
  delete from game.pity where player_id = v_player;
  delete from game.store_purchases where player_id = v_player;
  delete from game.quests where player_id = v_player;
  delete from game.achievements where player_id = v_player;
  delete from game.counters where player_id = v_player;
  delete from game.modifiers where player_id = v_player;
  delete from game.upgrades_owned where player_id = v_player;
  delete from game.bunker where player_id = v_player;
  delete from game.shifts where player_id = v_player;
  delete from game.job_hours where player_id = v_player;
  delete from game.minigame_runs where player_id = v_player;
  delete from game.stamps where player_id = v_player;
  delete from game.notifications where player_id = v_player;
  delete from game.ledger where player_id = v_player;
  update game.players
  set cash_cents = 0, level = 1, ep = 0, skill_points = 0, ruf = 500, pfandbons = 0,
      energy = private.cfg_num('energy.max')::int, energy_at = private.now(), prestige = 0, stars = 0,
      tutorial_step = 0, quests_claimed = 0, title = null, reroll_day = null, daily_bonus_day = null,
      weekly_bonus_week = null, reset_at = private.now()
  where id = v_player;
  perform private.money_add(v_player, private.eur(private.cfg_num('start.cash_base_cents')), 'start_capital');
  perform private.quests_fill(v_player);
  perform private.feed_add('player_reset', jsonb_build_object('name', r.username));
  return public.me_get();
end $$;

create or replace function public.account_delete(p_request_id uuid, p_confirm text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  r game.players;
begin
  select * into r from game.players where id = v_player for update;
  if lower(btrim(coalesce(p_confirm, ''))) <> r.username_key then
    perform private.fail('confirm_wrong');
  end if;
  if private.account_busy(v_player) then
    perform private.fail('account_busy');
  end if;
  perform private.shipment_deliver(s.id) from game.shipments s where s.buyer_id = v_player and s.seller_id is not null;
  delete from game.players where id = v_player; -- cascades to everything the player owns
  update game.feed set data = jsonb_set(data, '{name}', '"Gelöschter Spieler"') where data ->> 'name' = r.username;
  if r.is_admin then
    update game.players set is_admin = true
    where id = (select id from game.players order by created_at limit 1);
  end if;
  return public.me_get();
end $$;
