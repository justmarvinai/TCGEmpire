-- alpha_12 fair play (owner request, decision 111). Second accounts are allowed, so value must not flow freely between
-- accounts, while normal play stays as it is:
--   A  Cardmarket: players list and bid only at 50-200 % of the Marktwert (slabs: their value).
--   B  Company prices stay within 50-300 % of the fair price; an order never pays more than that band.
--   C  Privatkredit: one running loan per borrower, at most a day of the borrower's reference income.
--   D  What a player receives as gifts or trade surpluses is capped per day (two hours of their reference income).
--   E  EP from opening packs only for the first 400 packs of a day.
--   F  At most three Aushelfen received a day.
--   G  Box Break spots at most 120 % (config only).
--   H  One-way value between players is logged for the admin console; market and company flows are kept out of the
--      Wochenwertung like gifts.
-- All numbers live in content/config.ts.

create table game.daily_counts (
  player_id uuid not null references game.players (id) on delete cascade,
  day date not null,
  key text not null,
  n bigint not null default 0,
  primary key (player_id, day, key)
);
alter table game.daily_counts enable row level security;

create table game.transfers (
  id bigint generated always as identity primary key,
  at timestamptz not null,
  from_id uuid not null references game.players (id) on delete cascade,
  to_id uuid not null references game.players (id) on delete cascade,
  kind text not null check (kind in ('gift', 'trade', 'market', 'loan', 'company')),
  cents bigint not null check (cents > 0)
);
create index transfers_at on game.transfers (at);
create index transfers_from on game.transfers (from_id);
create index transfers_to on game.transfers (to_id);
alter table game.transfers enable row level security;

create function private.daily_get(p_player uuid, p_key text) returns bigint
language sql stable set search_path = '' as $$
  select coalesce((select n from game.daily_counts where player_id = p_player and day = private.today() and key = p_key), 0)
$$;

-- Adds to today's count and returns the new total.
create function private.daily_bump(p_player uuid, p_key text, p_n bigint) returns bigint
language sql set search_path = '' as $$
  insert into game.daily_counts (player_id, day, key, n) values (p_player, private.today(), p_key, p_n)
  on conflict (player_id, day, key) do update set n = game.daily_counts.n + excluded.n
  returning n
$$;

-- H: one-way value between two players, for the admin console.
create function private.transfer_log(p_from uuid, p_to uuid, p_kind text, p_cents bigint) returns void
language plpgsql set search_path = '' as $$
begin
  if p_from is not null and p_to is not null and p_from <> p_to and coalesce(p_cents, 0) > 0 then
    insert into game.transfers (at, from_id, to_id, kind, cents) values (private.now(), p_from, p_to, p_kind, p_cents);
  end if;
end $$;

-- A: the price band of the Cardmarket for players (NPC listings and orders are the market itself).
create function private.market_band_check(p_value bigint, p_price bigint) returns void
language plpgsql stable set search_path = '' as $$
begin
  if coalesce(p_value, 0) > 0 and (
       p_price < floor(p_value * private.cfg_num('market.player_min_pct') / 100)
    or p_price > ceil(p_value * private.cfg_num('market.player_max_pct') / 100)) then
    perform private.fail('price_band');
  end if;
end $$;

create function private.on_listing_band() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.seller_id is not null then
    perform private.market_band_check(
      case when new.item_kind = 'copy' then private.copy_value(new.copy_id) else private.card_or_product_value(new.item_id) end,
      new.price_cents);
  end if;
  return new;
end $$;
create trigger listings_band before insert on game.listings
  for each row execute function private.on_listing_band();

create function private.on_order_band() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.buyer_id is not null then
    perform private.market_band_check(private.card_or_product_value(new.item_id), new.price_cents);
  end if;
  return new;
end $$;
create trigger buy_orders_band before insert on game.buy_orders
  for each row execute function private.on_order_band();

-- B: the fair price of a company's service (the big graders' fee times the company's brand) and the band around it.
create function private.company_fair_cents(p_company bigint, p_service text) returns bigint
language sql stable set search_path = '' as $$
  select round(private.eur((private.cfg('company.services') -> p_service ->> 'ref_fee_base_cents')::numeric)
               * private.company_brand_bps(p_company) / 10000.0)::bigint
$$;

create function private.on_company_prices() returns trigger
language plpgsql set search_path = '' as $$
declare
  k text;
  v_fair bigint;
  v_price numeric;
begin
  for k in select jsonb_object_keys(new.prices) loop
    continue when new.prices -> k is not distinct from old.prices -> k;
    v_fair := private.company_fair_cents(new.id, k);
    v_price := (new.prices ->> k)::numeric;
    if v_fair > 0 and (v_price < v_fair * private.cfg_num('company.price_min_pct') / 100
                       or v_price > v_fair * private.cfg_num('company.price_max_pct') / 100) then
      perform private.fail('price_band');
    end if;
  end loop;
  return new;
end $$;
create trigger companies_price_band before update of prices on game.companies
  for each row execute function private.on_company_prices();

-- C: loans stay small and one at a time.
create function private.loan_max_cents(p_borrower uuid) returns bigint
language sql stable set search_path = '' as $$
  select round(private.eur(private.ref_income_base((select level from game.players where id = p_borrower))
               * private.cfg_num('loan.max_minutes') / 60))::bigint
$$;

create function private.on_loan_limits() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or (new.state = 'active' and old.state is distinct from 'active') then
    if new.principal_cents > private.loan_max_cents(new.borrower_id) then
      perform private.fail('loan_too_big');
    end if;
    if exists (select 1 from game.loans where borrower_id = new.borrower_id and state = 'active' and id <> new.id) then
      perform private.fail('loan_active');
    end if;
  end if;
  return new;
end $$;
create trigger loans_limits before insert or update of state on game.loans
  for each row execute function private.on_loan_limits();

-- H: a burst loan hands the principal over, a repaid one the interest.
create function private.on_loan_flow() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.state = 'defaulted' and old.state = 'active' then
    perform private.transfer_log(new.lender_id, new.borrower_id, 'loan', new.principal_cents);
  elsif new.state = 'repaid' and old.state = 'active' then
    perform private.transfer_log(new.borrower_id, new.lender_id, 'loan', private.loan_due(new) - new.principal_cents);
  end if;
  return null;
end $$;
create trigger loans_flow after update of state on game.loans
  for each row execute function private.on_loan_flow();

-- D: what a player may still receive today as gifts or trade surpluses.
create function private.receive_left(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select greatest(0, round(private.eur(private.ref_income_base((select level from game.players where id = p_player))
           * private.cfg_num('gift.receive_cap_minutes') / 60))::bigint - private.daily_get(p_player, 'received'))
$$;

create function private.receive_book(p_player uuid, p_cents bigint) returns void
language plpgsql set search_path = '' as $$
begin
  if coalesce(p_cents, 0) <= 0 then
    return;
  end if;
  if p_cents > private.receive_left(p_player) then
    perform private.fail('receive_cap');
  end if;
  perform private.daily_bump(p_player, 'received', p_cents);
end $$;

-- F: at most a few Aushelfen received a day (one per helper, as before).
create function private.on_friend_act_cap() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kind = 'aushelfen'
     and not exists (select 1 from game.friend_acts where actor_id = new.actor_id and target_id = new.target_id
                     and kind = new.kind and day = new.day)
     and (select count(*) from game.friend_acts where target_id = new.target_id and kind = 'aushelfen' and day = new.day)
         >= private.cfg_num('help.max_received') then
    perform private.fail('help_cap');
  end if;
  return new;
end $$;
create trigger friend_acts_cap before insert on game.friend_acts
  for each row execute function private.on_friend_act_cap();

create or replace function public.gift_send(p_request_id uuid, p_to uuid, p_goods jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'gift_send');
  v_goods jsonb;
  v_value bigint;
  v_tax bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'trade', private.cfg_num('rate.trade')::int, 60);
  perform private.trade_check(v_player, p_to, false);
  v_goods := private.goods_clean(p_goods);
  if private.goods_empty(v_goods) then
    perform private.fail('invalid_request');
  end if;
  perform private.lock_pair(v_player, p_to);
  if not private.goods_owned(v_player, v_goods) then
    perform private.fail('not_owned');
  end if;
  v_value := private.goods_value(v_goods);
  perform private.receive_book(p_to, v_value);
  v_tax := private.gift_book(v_player, v_value);
  perform private.goods_move(v_player, p_to, v_goods, 'gift');
  perform private.transfer_log(v_player, p_to, 'gift', v_value);
  perform private.notify(p_to, 'gift_received', jsonb_build_object(
    'name', (select username from game.players where id = v_player), 'cents', v_value));
  perform private.emit(v_player, 'gift_sent');
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'value_cents', v_value, 'tax_cents', v_tax, 'trades', private.trades_doc(v_player), 'player', private.me(v_player)));
end $$;

create or replace function public.trade_answer(p_request_id uuid, p_trade bigint, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'trade_answer');
  t game.trades;
  v_give bigint;
  v_take bigint;
  v_tax bigint := 0;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'trade', private.cfg_num('rate.trade')::int, 60);
  select * into t from game.trades
  where id = p_trade and (from_id = v_player or to_id = v_player) and expires_at > private.now()
  for update;
  if not found or (t.from_id = v_player and p_accept) then
    perform private.fail('not_found');
  end if;

  if p_accept then
    perform private.trade_check(v_player, t.from_id, true);
    perform private.lock_pair(t.from_id, t.to_id);
    if not private.goods_owned(t.from_id, t.give) then
      perform private.fail('trade_invalid');
    end if;
    if not private.goods_owned(t.to_id, t.take) then
      perform private.fail('not_owned');
    end if;
    v_give := private.goods_value(t.give);
    v_take := private.goods_value(t.take);
    -- the side that hands over more value gifts the difference; the offerer must still afford money and tax
    if (select cash_cents from game.players where id = t.from_id)
       < (t.give ->> 'money_cents')::bigint + private.gift_tax(t.from_id, greatest(0, v_give - v_take)) then
      perform private.fail('trade_invalid');
    end if;
    -- whoever ends up with more value receives the difference: capped per day like a gift
    perform private.receive_book(t.to_id, v_give - v_take);
    perform private.receive_book(t.from_id, v_take - v_give);
    perform private.gift_book(t.from_id, v_give - v_take);
    v_tax := private.gift_book(t.to_id, v_take - v_give);
    perform private.transfer_log(t.from_id, t.to_id, 'trade', v_give - v_take);
    perform private.transfer_log(t.to_id, t.from_id, 'trade', v_take - v_give);
    perform private.goods_move(t.from_id, t.to_id, t.give, 'trade');
    perform private.goods_move(t.to_id, t.from_id, t.take, 'trade');
    perform private.emit(t.from_id, 'trade_done');
    perform private.emit(t.to_id, 'trade_done');
  end if;
  delete from game.trades where id = t.id;
  if t.to_id = v_player then
    perform private.notify(t.from_id, case when p_accept then 'trade_accepted' else 'trade_declined' end,
      jsonb_build_object('name', (select username from game.players where id = v_player)));
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'tax_cents', v_tax, 'trades', private.trades_doc(v_player), 'player', private.me(v_player)));
end $$;

create or replace function public.trade_quote(p_to uuid, p_give jsonb, p_take jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_give jsonb := private.goods_clean(p_give);
  v_take jsonb := private.goods_clean(coalesce(p_take, '{}'::jsonb));
  v_give_cents bigint := private.goods_value(v_give);
  v_take_cents bigint := private.goods_value(v_take);
begin
  if not exists (select 1 from game.players where id = p_to and id <> v_player) then
    perform private.fail('invalid_request');
  end if;
  return jsonb_build_object(
    'give_cents', v_give_cents,
    'take_cents', v_take_cents,
    'my_tax_cents', private.gift_tax(v_player, greatest(0, v_give_cents - v_take_cents)),
    'their_tax_cents', private.gift_tax(p_to, greatest(0, v_take_cents - v_give_cents)),
    'allowance_left_cents', private.gift_allowance_left(v_player),
    -- what each side may still receive today as gifts or trade surpluses
    'my_receive_left_cents', private.receive_left(v_player),
    'their_receive_left_cents', private.receive_left(p_to)
  );
end $$;

create or replace function private.sale_ship(
  p_seller uuid, p_npc_seller text, p_buyer uuid, p_npc_buyer text,
  p_kind text, p_item text, p_copy uuid, p_qty int, p_total bigint
) returns void
language plpgsql set search_path = '' as $$
declare
  v_copy uuid := p_copy;
  v_minutes numeric := private.cfg_num('market.ship_min_minutes')
    + private.rand() * (private.cfg_num('market.ship_max_minutes') - private.cfg_num('market.ship_min_minutes'));
  v_slab text;
  v_fee_bps numeric := greatest(0, private.cfg_num('market.fee_bps')
    - case when p_seller is not null then private.stat(p_seller, 'fee_cut_bps', 0) else 0 end);
  -- the Marktwert of what changes hands, before it moves
  v_value bigint := case when p_kind = 'copy' then private.copy_value(p_copy)
                         else private.card_or_product_value(p_item) * p_qty end;
begin
  -- between two players, a price away from the Marktwert moves value from one to the other: logged for the
  -- admin and kept out of the Wochenwertung like a gift
  if p_seller is not null and p_buyer is not null and v_value is not null then
    if p_total > v_value then
      perform private.transfer_log(p_buyer, p_seller, 'market', p_total - v_value);
      perform private.league_shift(p_buyer, p_seller, p_total - v_value);
    elsif p_total < v_value then
      perform private.transfer_log(p_seller, p_buyer, 'market', v_value - p_total);
      perform private.league_shift(p_seller, p_buyer, v_value - p_total);
    end if;
  end if;
  if p_kind = 'copy' then
    select upper(grader) || ' ' || case when black_label then 'BL ' else '' end || trim(to_char(grade, 'FM99.9'), '.')
    into v_slab from game.card_copies where id = p_copy and grader is not null;
    if p_buyer is not null then
      update game.card_copies set owner_id = p_buyer, location = 'shipping' where id = p_copy;
    else
      delete from game.card_copies where id = p_copy;  -- NPCs keep what they buy; it leaves the world
      v_copy := null;
    end if;
  end if;
  insert into game.shipments (buyer_id, seller_id, npc_buyer, npc_seller, item_kind, item_id, copy_id, qty,
                              total_cents, fee_cents, arrives_at, created_at)
  values (p_buyer, p_seller, p_npc_buyer, p_npc_seller, p_kind, p_item, v_copy, p_qty,
          p_total, round(p_total * v_fee_bps / 10000), private.now() + make_interval(secs => v_minutes * 60), private.now());
  insert into game.sales_log (item_id, qty, price_cents, at, slab) values (p_item, p_qty, p_total / p_qty, private.now(), v_slab);
  if v_slab is null then
    perform private.price_push(p_item, p_total / p_qty);
  end if;
end $$;

create or replace function public.company_order_submit(p_request_id uuid, p_copies uuid[], p_company bigint, p_service text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_order_submit');
  c game.companies;
  v_n int := coalesce(array_length(p_copies, 1), 0);
  v_fee bigint;
  v_found int;
  v_fair bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'grading');
  perform private.rate_limit(v_player, 'grading', private.cfg_num('rate.grading')::int, 60);
  select * into c from game.companies where id = p_company and closed_at is null for update;
  if not found or c.owner_id = v_player or p_service is null
     or not (private.company_stage_def(c.stage) -> 'services') ? p_service
     or v_n = 0 or v_n > 50 or v_n <> (select count(distinct x) from unnest(p_copies) x) then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id in (v_player, c.owner_id) order by id for update;
  if (select count(*) from game.grading_orders where player_id = v_player) + v_n > private.grading_slots(v_player) then
    perform private.fail('no_slots');
  end if;
  -- never more than the price band above the fair price, even if the fair price fell since the price was set
  v_fair := private.company_fair_cents(c.id, p_service);
  v_fee := least((c.prices ->> p_service)::bigint, round(v_fair * private.cfg_num('company.price_max_pct') / 100)::bigint);
  with taken as (
    update game.card_copies set location = 'grading'
    where id = any (p_copies) and owner_id = v_player and location = 'inventory' and grader is null
    returning id
  ), placed as (
    insert into game.grading_orders (player_id, copy_id, grader, service, fee_cents, submitted_at, due_at)
    select v_player, t.id, 'co:' || c.id, p_service, v_fee, private.now(),
           private.now() + make_interval(mins => private.company_eta_minutes(c, p_service))
    from taken t
    returning 1
  )
  select count(*) into v_found from placed;
  if v_found <> v_n then
    perform private.fail('not_owned');
  end if;
  -- the customer pays the company
  perform private.money_add(v_player, -v_fee * v_n, 'grading', 'co:' || c.id);
  update game.companies set cash_cents = cash_cents + v_fee * v_n where id = c.id;
  perform private.company_book(c.id, 0, v_fee * v_n, 0);
  perform private.transfer_log(v_player, c.owner_id, 'company', v_fee * v_n);
  perform private.league_shift(v_player, c.owner_id, greatest(0, v_fee - v_fair) * v_n);
  perform private.emit(v_player, 'grading_submitted', v_n);
  perform private.notify(c.owner_id, 'company_order', jsonb_build_object('name', (select username from game.players where id = v_player), 'n', v_n));
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'fee_cents', v_fee * v_n, 'grading', private.grading_doc(v_player), 'player', private.me(v_player)));
end $$;

create or replace function public.pack_open(p_request_id uuid, p_product text, p_qty int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'pack_open');
  v_set text;
  v_name text;
  v_ids text[];
  v_id text;
  v_card jsonb;
  v_cards jsonb;
  v_packs jsonb := '[]';
  v_pack_value bigint;
  v_pack_hit boolean;
  v_total bigint := 0;
  v_new int := 0;
  v_hits int := 0;
  v_energy int := 0;
  v_before bigint;
  v_eligible int;
  i int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'open', private.cfg_num('rate.open')::int, 60);
  if p_qty is null or p_qty < 1 or p_qty > private.cfg_num('pack.max_open') then
    perform private.fail('invalid_request');
  end if;
  select set_id into v_set from game.product_defs where id = p_product;
  if not found then
    perform private.fail('invalid_request');
  end if;
  update game.sealed set qty = qty - p_qty where player_id = v_player and product_id = p_product and qty >= p_qty;
  if not found then
    perform private.fail('not_enough_sealed');
  end if;
  select username into v_name from game.players where id = v_player;

  for i in 1 .. p_qty loop
    v_ids := private.roll_pack(v_player, p_product);
    v_cards := '[]';
    v_pack_value := 0;
    v_pack_hit := false;
    foreach v_id in array v_ids loop
      v_card := private.give_card(v_player, v_id);
      v_cards := v_cards || v_card;
      v_pack_value := v_pack_value + (v_card ->> 'value_cents')::bigint;
      if (v_card ->> 'new')::boolean then v_new := v_new + 1; end if;
      if v_card ->> 'kind' = 'energy' then v_energy := v_energy + 1; end if;
      if v_card ->> 'tier' in ('holo', 'alternative', 'ultra', 'grail') then
        v_hits := v_hits + 1;
        v_pack_hit := true;
      end if;
      if v_card ->> 'tier' in ('ultra', 'grail') then
        perform private.feed_add('pull_' || (v_card ->> 'tier'), jsonb_build_object('name', v_name, 'card_id', v_id));
      end if;
    end loop;
    insert into game.pity (player_id, set_id, dry) values (v_player, v_set, case when v_pack_hit then 0 else 1 end)
    on conflict (player_id, set_id) do update set dry = case when v_pack_hit then 0 else game.pity.dry + 1 end;
    v_packs := v_packs || jsonb_build_object('cards', v_cards, 'value_cents', v_pack_value);
    v_total := v_total + v_pack_value;
  end loop;

  -- EP only for the first packs of a day (more than an all-out player opens); new cards always count
  v_before := private.daily_bump(v_player, 'packs', p_qty) - p_qty;
  v_eligible := greatest(0, least(p_qty, private.cfg_num('ep.pack_daily_cap')::int - v_before));
  perform private.ep_grant(v_player, v_eligible * private.cfg_num('ep.pack') + v_new * private.cfg_num('ep.new_card'));
  perform private.emit(v_player, 'pack_opened', p_qty);
  if v_new > 0 then perform private.emit(v_player, 'card_new', v_new); end if;
  if v_hits > 0 then perform private.emit(v_player, 'hit_pulled', v_hits); end if;
  if v_energy > 0 then perform private.emit(v_player, 'energy_pulled', v_energy); end if;

  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'packs', v_packs, 'total_value_cents', v_total, 'price_cents', private.kiosk_price(p_product),
    'ep_capped', v_eligible < p_qty,
    'player', private.me(v_player)));
end $$;

create or replace function private.tick_cleanup() returns void
language plpgsql set search_path = '' as $$
declare
  v_now timestamptz := private.now();
begin
  delete from game.requests where at < v_now - interval '1 day';
  delete from game.rate_limits where window_start < v_now - interval '1 day';
  delete from game.ledger where at < v_now - interval '14 days';
  delete from game.job_runs where started_at < v_now - interval '7 days';
  delete from game.notifications where at < v_now - interval '30 days';
  delete from game.feed where id <= (select max(id) from game.feed) - 2000;
  delete from game.sessions where last_used_at < v_now - interval '90 days';
  delete from game.quests where claimed_at < v_now - interval '14 days';
  delete from game.modifiers where expires_at < v_now - interval '1 day';
  delete from game.minigame_runs where started_at < v_now - interval '7 days';
  delete from game.transfers where at < v_now - interval '30 days';
  delete from game.daily_counts where day < private.today() - 7;
end $$;

-- All limits a player may run into, with the ones of another player (loans, gifts, help) when asked.
create function public.limits_get(p_target uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object(
    'market_min_pct', private.cfg_num('market.player_min_pct')::int,
    'market_max_pct', private.cfg_num('market.player_max_pct')::int,
    'company_min_pct', private.cfg_num('company.price_min_pct')::int,
    'company_max_pct', private.cfg_num('company.price_max_pct')::int,
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
select private.expose('public.limits_get(uuid)');

-- H: the largest one-way flows between two players (gifts, trade surpluses, market prices away from the Marktwert,
-- burst loans and interest, company orders) and who receives the most. Admins only.
create function public.admin_flows(p_days int) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_admin();
  v_days int := least(greatest(coalesce(p_days, 7), 1), 30);
  v_since timestamptz := private.now() - make_interval(days => least(greatest(coalesce(p_days, 7), 1), 30));
begin
  return jsonb_build_object(
    'days', v_days,
    'pairs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'from', jsonb_build_object('id', f.id, 'name', f.username),
        'to', jsonb_build_object('id', o.id, 'name', o.username),
        'cents', t.cents,
        'kinds', t.kinds,
        'back_cents', coalesce((select sum(b.cents) from game.transfers b
                                where b.from_id = t.to_id and b.to_id = t.from_id and b.at >= v_since), 0),
        'to_net_worth_cents', private.net_worth(o.id)
      ) order by t.cents desc)
      from (
        select from_id, to_id, sum(s)::bigint as cents, jsonb_object_agg(kind, s) as kinds
        from (select from_id, to_id, kind, sum(cents)::bigint as s from game.transfers where at >= v_since group by 1, 2, 3) k
        group by from_id, to_id
        order by sum(s) desc
        limit 20
      ) t
      join game.players f on f.id = t.from_id
      join game.players o on o.id = t.to_id
    ), '[]'::jsonb),
    'receivers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'player', jsonb_build_object('id', p.id, 'name', p.username),
        'cents', r.cents, 'givers', r.givers, 'net_worth_cents', private.net_worth(p.id)
      ) order by r.cents desc)
      from (select to_id, sum(cents)::bigint as cents, count(distinct from_id)::int as givers
            from game.transfers where at >= v_since group by to_id order by 2 desc limit 10) r
      join game.players p on p.id = r.to_id
    ), '[]'::jsonb)
  );
end $$;
select private.expose('public.admin_flows(int)');
