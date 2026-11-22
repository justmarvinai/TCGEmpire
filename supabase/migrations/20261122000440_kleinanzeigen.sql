-- alpha_04 (Flip), part 5: Kleinanzeigen (docs/GAME_DESIGN.md §7.2). NPC ads from attic finders, normal
-- sellers and dreamers; haggling that ends in a deal, a counter offer or a block; hidden risks (fake, Knick,
-- seller ghosts after payment); own ads that NPC buyers answer — Lars lowballs, Kevin (12) overpays and his
-- mum may book it back. No fees, no buyer protection, pickup at once.

create table game.ads (
  id bigint generated always as identity primary key,
  seller_id uuid references game.players (id) on delete cascade,
  npc_id text references game.npcs (id) on delete cascade,
  seller_idx int,
  style text not null check (style in ('attic', 'normal', 'dreamer', 'player')),
  title_idx int not null default 0,
  item_kind text not null check (item_kind in ('card', 'copy', 'sealed')),
  item_id text not null,
  copy_id uuid references game.card_copies (id) on delete cascade,
  qty int not null check (qty > 0),
  ask_cents bigint not null check (ask_cents > 0),
  min_cents bigint,
  patience int not null default 3,
  risk text check (risk in ('fake', 'knick', 'ghost')),
  created_at timestamptz not null,
  expires_at timestamptz not null,
  check ((seller_id is null) = (style <> 'player'))
);
create index ads_seller on game.ads (seller_id);
create index ads_npc on game.ads (npc_id);
create index ads_copy on game.ads (copy_id);
create index ads_expires on game.ads (expires_at);

create table game.ad_offers (
  id bigint generated always as identity primary key,
  ad_id bigint not null references game.ads (id) on delete cascade,
  player_id uuid references game.players (id) on delete cascade,
  npc_id text references game.npcs (id) on delete cascade,
  price_cents bigint not null,
  state text not null check (state in ('open', 'accepted', 'declined', 'countered', 'blocked')),
  reply_kind text,
  reply_idx int,
  counter_cents bigint,
  created_at timestamptz not null
);
create index ad_offers_ad on game.ad_offers (ad_id);
create index ad_offers_player on game.ad_offers (player_id);
create index ad_offers_npc on game.ad_offers (npc_id);

create table game.chargebacks (
  id bigint generated always as identity primary key,
  player_id uuid not null references game.players (id) on delete cascade,
  cents bigint not null,
  due_at timestamptz not null
);
create index chargebacks_player on game.chargebacks (player_id);
create index chargebacks_due on game.chargebacks (due_at);

alter table game.ads enable row level security;
alter table game.ad_offers enable row level security;
alter table game.chargebacks enable row level security;

create function private.rand_between(p_lo numeric, p_hi numeric) returns numeric
language sql volatile set search_path = '' as $$
  select p_lo + private.rand()::numeric * (p_hi - p_lo)
$$;

-- A new NPC ad: style decides the price, the hidden minimum and the hidden risk.
create function private.ad_create_npc() returns void
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
    select id into v_item from game.product_defs where kind = 'booster' order by private.rand() limit 1;
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

-- An ad leaves the board: a player's items go back to the inventory.
create function private.ad_close(p_ad bigint, p_return boolean) returns void
language plpgsql set search_path = '' as $$
declare
  a game.ads;
begin
  delete from game.ads where id = p_ad returning * into a;
  if not found or a.seller_id is null or not p_return then
    return;
  end if;
  if a.item_kind = 'copy' then
    update game.card_copies set location = 'inventory' where id = a.copy_id;
  else
    perform private.item_give(a.seller_id, a.item_kind, a.item_id, null, a.qty);
  end if;
end $$;

-- An NPC answers a player's ad.
create function private.ad_npc_offer(a game.ads) returns void
language plpgsql set search_path = '' as $$
declare
  v_value bigint := private.card_or_product_value(a.item_id) * a.qty;
  v_r numeric := private.rand();
  v_npc game.npcs;
  v_kind text;
  v_price bigint;
begin
  if v_r < 0.5 then
    select * into v_npc from game.npcs where archetype = 'lowballer' order by private.rand() limit 1;
    v_kind := 'lowball';
    v_price := round(v_value * private.rand_between(0.4, 0.6));
  elsif v_r < 0.85 then
    select * into v_npc from game.npcs where archetype = 'collector' order by private.rand() limit 1;
    v_kind := 'fair';
    v_price := round(v_value * private.rand_between(0.8, 1));
  else
    select * into v_npc from game.npcs where archetype = 'kid' order by private.rand() limit 1;
    v_kind := 'kid';
    v_price := round(a.ask_cents * private.rand_between(1.1, 1.6));
  end if;
  if v_npc.id is null or v_npc.budget_cents < v_price or v_price < 1 then
    return;
  end if;
  insert into game.ad_offers (ad_id, npc_id, price_cents, state, reply_kind, reply_idx, created_at)
  values (a.id, v_npc.id, v_price, 'open', v_kind, floor(private.rand() * 1000)::int, private.now());
  perform private.notify(a.seller_id, 'ad_offer', jsonb_build_object('item_id', a.item_id, 'name', v_npc.name, 'cents', v_price));
end $$;

create function private.tick_ads() returns void
language plpgsql set search_path = '' as $$
declare
  v_id bigint;
  a game.ads;
  c game.chargebacks;
  v_cash bigint;
begin
  for v_id in select id from game.ads where expires_at <= private.now() loop
    begin
      if (select seller_id from game.ads where id = v_id) is not null then
        perform private.notify((select seller_id from game.ads where id = v_id), 'ad_expired',
          jsonb_build_object('item_id', (select item_id from game.ads where id = v_id)));
      end if;
      perform private.ad_close(v_id, true);
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('ads', private.now(), 0, false, sqlerrm);
    end;
  end loop;

  for v_id in 1 .. greatest(0, private.cfg_num('ads.npc_count')::int - (select count(*) from game.ads where seller_id is null)::int) loop
    perform private.ad_create_npc();
  end loop;

  for a in select * from game.ads where seller_id is not null loop
    if (select count(*) from game.ad_offers where ad_id = a.id and state = 'open') < private.cfg_num('ads.max_offers')
       and private.rand() * 100 < private.cfg_num('ads.offer_chance_pct') then
      perform private.ad_npc_offer(a);
    end if;
  end loop;

  -- Kevin's mum calls the bank.
  for c in select * from game.chargebacks where due_at <= private.now() loop
    select cash_cents into v_cash from game.players where id = c.player_id for update;
    if least(c.cents, v_cash) > 0 then
      perform private.money_add(c.player_id, -least(c.cents, v_cash), 'chargeback');
    end if;
    delete from game.chargebacks where id = c.id;
    perform private.notify(c.player_id, 'chargeback', jsonb_build_object('cents', least(c.cents, v_cash)));
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('ads', 300);

-- ---------------------------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------------------------
create function private.ads_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlocked', (select level from game.players where id = p_player) >= private.cfg_num('unlock.kleinanzeigen'),
    'unlock_level', private.cfg_num('unlock.kleinanzeigen'),
    'slots', private.cfg_num('ads.player_slots')::int,
    'board', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'seller', (select n.name from game.npcs n where n.id = a.npc_id), 'seller_idx', a.seller_idx,
      'npc', a.npc_id is not null, 'style', a.style, 'title_idx', a.title_idx,
      'item_kind', a.item_kind, 'item_id', a.item_id, 'qty', a.qty, 'ask_cents', a.ask_cents,
      'value_cents', private.card_or_product_value(a.item_id) * a.qty,
      'created_at', a.created_at, 'expires_at', a.expires_at,
      'mine', (select jsonb_build_object('price_cents', o.price_cents, 'state', o.state, 'counter_cents', o.counter_cents,
                 'reply_kind', o.reply_kind, 'reply_idx', o.reply_idx)
               from game.ad_offers o where o.ad_id = a.id and o.player_id = p_player order by o.id desc limit 1)
    ) order by a.created_at desc) from game.ads a where a.seller_id is null), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'item_kind', a.item_kind, 'item_id', a.item_id, 'qty', a.qty, 'ask_cents', a.ask_cents,
      'value_cents', private.card_or_product_value(a.item_id) * a.qty, 'expires_at', a.expires_at,
      'offers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', n.name, 'archetype', n.archetype,
                  'price_cents', o.price_cents, 'reply_kind', o.reply_kind, 'reply_idx', o.reply_idx) order by o.id)
                from game.ad_offers o join game.npcs n on n.id = o.npc_id where o.ad_id = a.id and o.state = 'open'), '[]'::jsonb)
    ) order by a.created_at desc) from game.ads a where a.seller_id = p_player), '[]'::jsonb),
    'owned', jsonb_build_object(
      'stacks', coalesce((select jsonb_agg(jsonb_build_object('item_id', card_id, 'qty', qty) order by card_id)
                          from game.card_stacks where player_id = p_player and qty > 0), '[]'::jsonb),
      'copies', coalesce((select jsonb_agg(jsonb_build_object('copy_id', id, 'item_id', card_id) order by card_id, pulled_at)
                          from game.card_copies where owner_id = p_player and location = 'inventory'), '[]'::jsonb),
      'sealed', coalesce((select jsonb_agg(jsonb_build_object('item_id', product_id, 'qty', qty) order by product_id)
                          from game.sealed where player_id = p_player and qty > 0), '[]'::jsonb)
    )
  )
$$;

create function public.ads_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return private.ads_doc(v_player);
end $$;
select private.expose('public.ads_get()');

-- ---------------------------------------------------------------------------------------------
-- Haggling with an NPC ad: an offer at or above the hidden minimum is a deal at that price.
-- ---------------------------------------------------------------------------------------------
create function public.ad_offer(p_request_id uuid, p_ad bigint, p_price bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'ad_offer');
  a game.ads;
  v_price bigint;
  v_state text;
  v_counter bigint;
  v_outcome text := 'ok';
  v_copy uuid;
  v_patience int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'kleinanzeigen');
  perform private.rate_limit(v_player, 'market', private.cfg_num('rate.market')::int, 60);
  if coalesce(p_price, 0) < 1 or p_price > 100000000000 then
    perform private.fail('invalid_request');
  end if;
  select * into a from game.ads where id = p_ad and seller_id is null and expires_at > private.now() for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if exists (select 1 from game.ad_offers where ad_id = a.id and player_id = v_player and state = 'blocked') then
    perform private.fail('blocked');
  end if;

  if p_price >= a.min_cents then
    v_price := least(p_price, a.ask_cents);
    v_state := 'accepted';
    perform private.money_add(v_player, -v_price, 'kleinanzeigen', a.item_id);
    if a.risk = 'ghost' then
      v_outcome := 'ghost';
    elsif a.risk = 'fake' then
      v_outcome := 'fake';
    elsif a.risk = 'knick' and a.item_kind = 'card' and private.is_hit(a.item_id) then
      v_outcome := 'knick';
      v_copy := private.copy_create(v_player, a.item_id);
      update game.card_copies set q_corners = greatest(1, q_corners - 4), q_surface = greatest(1, q_surface - 3) where id = v_copy;
      insert into game.collection (player_id, card_id, first_at) values (v_player, a.item_id, private.now()) on conflict do nothing;
    else
      perform private.item_give(v_player, a.item_kind, a.item_id, null, a.qty);
    end if;
    if a.item_kind <> 'sealed' and v_outcome in ('ok', 'knick') then
      perform private.emit(v_player, 'market_bought', a.qty);
    end if;
    perform private.ad_close(a.id, false);
  else
    update game.ads set patience = patience - 1 where id = a.id returning patience into v_patience;
    if p_price < a.min_cents * 0.5 or v_patience <= 0 then
      v_state := 'blocked';
    else
      v_state := 'countered';
      v_counter := greatest(a.min_cents, round((a.ask_cents + p_price) / 2.0));
    end if;
    insert into game.ad_offers (ad_id, player_id, price_cents, state, reply_kind, reply_idx, counter_cents, created_at)
    values (a.id, v_player, p_price, v_state, case v_state when 'blocked' then 'block' else 'counter' end,
            floor(private.rand() * 1000)::int, v_counter, private.now());
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'result', jsonb_build_object('state', v_state, 'outcome', v_outcome, 'counter_cents', v_counter, 'price_cents', coalesce(v_price, p_price)),
    'ads', private.ads_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.ad_offer(uuid, bigint, bigint)');

-- ---------------------------------------------------------------------------------------------
-- Own ads
-- ---------------------------------------------------------------------------------------------
create function public.ad_post(p_request_id uuid, p_kind text, p_item text, p_copy uuid, p_qty int, p_price bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'ad_post');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'kleinanzeigen');
  perform private.rate_limit(v_player, 'market', private.cfg_num('rate.market')::int, 60);
  perform private.market_check_price(p_qty, p_price);
  if p_kind = 'copy' and p_qty <> 1 or p_kind = 'card' and private.is_hit(p_item) then
    perform private.fail('invalid_request');
  end if;
  if (select count(*) from game.ads where seller_id = v_player) >= private.cfg_num('ads.player_slots') then
    perform private.fail('no_slots');
  end if;
  perform private.item_take(v_player, p_kind, p_item, p_copy, p_qty, 'listed');
  insert into game.ads (seller_id, style, item_kind, item_id, copy_id, qty, ask_cents, created_at, expires_at)
  values (v_player, 'player', p_kind, p_item, case when p_kind = 'copy' then p_copy end, p_qty, p_price, private.now(),
          private.now() + make_interval(days => private.cfg_num('ads.player_days')::int));
  return private.request_done(v_player, p_request_id, jsonb_build_object('ads', private.ads_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.ad_post(uuid, text, text, uuid, int, bigint)');

create function public.ad_remove(p_request_id uuid, p_ad bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'ad_remove');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if not exists (select 1 from game.ads where id = p_ad and seller_id = v_player) then
    perform private.fail('not_found');
  end if;
  perform private.ad_close(p_ad, true);
  return private.request_done(v_player, p_request_id, jsonb_build_object('ads', private.ads_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.ad_remove(uuid, bigint)');

-- Accept or decline an NPC's offer on an own ad. Accepted: paid at once from the NPC's budget, the goods are
-- gone; Kevin's payment can be booked back later.
create function public.ad_answer(p_request_id uuid, p_offer bigint, p_accept boolean) returns jsonb
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
    perform private.fail('not_found');
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
select private.expose('public.ad_answer(uuid, bigint, boolean)');

-- A reset also clears ads and pending chargebacks (no items back into the fresh account).
create function private.on_player_reset_ads() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.ads where seller_id = new.id;
    delete from game.ad_offers where player_id = new.id;
    delete from game.chargebacks where player_id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_ads after update of reset_at on game.players
  for each row execute function private.on_player_reset_ads();
