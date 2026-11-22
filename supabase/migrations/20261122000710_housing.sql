-- alpha_07 (Leben), part 2: Wohnen (docs/GAME_DESIGN.md §14). Homes and furnishing items from content/housing.ts.
-- A home brings storage, Vitrine places, faster energy and furnishing slots (modifiers with source `home`);
-- each furnishing slot holds one item with a small bonus (source `furniture:<slot>`). Moving sells the old home
-- back for half its price; Nebenkosten are charged once per German day. Net worth counts half of what housing
-- and furnishing cost. Visitors sign the Gästebuch on the profile.

create table game.home_defs (
  tier int primary key,
  key text not null unique,
  min_level int not null,
  price_base_cents bigint not null,
  wohnwert int not null,
  slots int not null,
  lager_units int not null,
  vitrine_slots int not null,
  energy_regen_pct int not null
);

create table game.furniture_defs (
  key text primary key,
  slot text not null,
  slot_index int not null,
  rank int not null,
  min_level int not null,
  price_base_cents bigint not null,
  wohnwert int not null,
  stat text not null,
  op text not null check (op in ('flat', 'pct')),
  value numeric not null
);

create table game.homes (
  player_id uuid primary key references game.players (id) on delete cascade,
  tier int not null references game.home_defs (tier),
  paid_cents bigint not null,
  moved_at timestamptz not null,
  charged_day date
);
create index homes_tier on game.homes (tier);

create table game.furnishings (
  player_id uuid not null references game.players (id) on delete cascade,
  slot text not null,
  item text not null references game.furniture_defs (key),
  paid_cents bigint not null,
  at timestamptz not null,
  primary key (player_id, slot)
);
create index furnishings_item on game.furnishings (item);

create table game.guestbook (
  id bigint generated always as identity primary key,
  host_id uuid not null references game.players (id) on delete cascade,
  author_id uuid references game.players (id) on delete set null,
  body text not null,
  at timestamptz not null
);
create index guestbook_host on game.guestbook (host_id, id desc);
create index guestbook_author on game.guestbook (author_id);

alter table game.home_defs enable row level security;
alter table game.furniture_defs enable row level security;
alter table game.homes enable row level security;
alter table game.furnishings enable row level security;
alter table game.guestbook enable row level security;

-- A reset moves the player back to Mutti (homes, furnishing and their modifiers go; the Gästebuch stays).
create function private.on_player_reset_housing() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.homes where player_id = new.id;
    delete from game.furnishings where player_id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_housing after update of reset_at on game.players
  for each row execute function private.on_player_reset_housing();

-- ---------------------------------------------------------------------------------------------
-- Engine
-- ---------------------------------------------------------------------------------------------
create function private.home_tier(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select coalesce((select tier from game.homes where player_id = p_player), 0)
$$;

create function private.wohnwert(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select (select wohnwert from game.home_defs where tier = private.home_tier(p_player))
       + coalesce((select sum(d.wohnwert) from game.furnishings f join game.furniture_defs d on d.key = f.item where f.player_id = p_player), 0)::int
$$;

-- The home's own bonuses as modifiers (replaced on every move).
create function private.home_apply(p_player uuid) returns void
language plpgsql set search_path = '' as $$
declare
  h game.home_defs;
begin
  select * into h from game.home_defs where tier = private.home_tier(p_player);
  delete from game.modifiers where player_id = p_player and source = 'home';
  insert into game.modifiers (player_id, source, stat, op, value)
  select p_player, 'home', s.stat, 'flat', s.value
  from (values ('lager_units', h.lager_units), ('vitrine_slots', h.vitrine_slots), ('energy_regen_pct', h.energy_regen_pct)) s (stat, value)
  where s.value > 0;
end $$;

create function private.housing_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.housing')::int,
    'tier', private.home_tier(p_player),
    'wohnwert', private.wohnwert(p_player),
    'paid_cents', coalesce((select paid_cents from game.homes where player_id = p_player), 0),
    'refund_cents', round(coalesce((select paid_cents from game.homes where player_id = p_player), 0)
                          * private.cfg_num('housing.refund_bps') / 10000)::bigint,
    'nebenkosten_cents', round(private.eur((select price_base_cents from game.home_defs where tier = private.home_tier(p_player)))
                               * private.cfg_num('housing.nebenkosten_bps') / 10000)::bigint,
    'homes', (select jsonb_agg(jsonb_build_object('tier', d.tier, 'price_cents', private.eur(d.price_base_cents),
                'nebenkosten_cents', round(private.eur(d.price_base_cents) * private.cfg_num('housing.nebenkosten_bps') / 10000)::bigint)
              order by d.tier) from game.home_defs d),
    'furnishings', coalesce((select jsonb_object_agg(f.slot, f.item) from game.furnishings f where f.player_id = p_player), '{}'::jsonb),
    'furniture', (select jsonb_agg(jsonb_build_object('key', d.key, 'price_cents', private.eur(d.price_base_cents)) order by d.slot_index, d.rank)
                  from game.furniture_defs d)
  )
$$;

-- ---------------------------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------------------------
create function public.housing_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return private.housing_doc(v_player);
end $$;
select private.expose('public.housing_get()');

-- Move into a better home: the old one is sold back for half its price.
create function public.home_buy(p_request_id uuid, p_tier int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'home_buy');
  h game.home_defs;
  v_old game.homes;
  v_price bigint;
  v_refund bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'housing');
  select * into h from game.home_defs where tier = p_tier;
  if not found then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  if p_tier <= private.home_tier(v_player) then
    perform private.fail('invalid_request');
  end if;
  if (select level from game.players where id = v_player) < h.min_level then
    perform private.fail('locked');
  end if;
  select * into v_old from game.homes where player_id = v_player;
  v_refund := round(coalesce(v_old.paid_cents, 0) * private.cfg_num('housing.refund_bps') / 10000);
  v_price := private.eur(h.price_base_cents);
  if v_refund > 0 then
    perform private.money_add(v_player, v_refund, 'home_sale');
  end if;
  perform private.money_add(v_player, -v_price, 'home', h.key);
  insert into game.homes (player_id, tier, paid_cents, moved_at, charged_day)
  values (v_player, p_tier, v_price, private.now(), private.today())
  on conflict (player_id) do update set tier = excluded.tier, paid_cents = excluded.paid_cents, moved_at = excluded.moved_at,
    charged_day = excluded.charged_day;
  perform private.home_apply(v_player);
  perform private.emit(v_player, 'home_bought');
  if p_tier >= 4 then
    perform private.feed_add('home', jsonb_build_object('name', (select username from game.players where id = v_player), 'home', h.key));
  end if;
  return private.request_done(v_player, p_request_id, private.housing_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.home_buy(uuid, int)');

-- Furnish a slot of the current home; the old item goes to the Sperrmüll.
create function public.furniture_buy(p_request_id uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'furniture_buy');
  d game.furniture_defs;
  v_price bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'housing');
  select * into d from game.furniture_defs where key = p_key;
  if not found then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  if d.slot_index >= (select slots from game.home_defs where tier = private.home_tier(v_player)) then
    perform private.fail('no_slots');
  end if;
  if (select level from game.players where id = v_player) < d.min_level then
    perform private.fail('locked');
  end if;
  if exists (select 1 from game.furnishings where player_id = v_player and slot = d.slot and item = d.key) then
    perform private.fail('already_owned');
  end if;
  v_price := private.eur(d.price_base_cents);
  perform private.money_add(v_player, -v_price, 'furniture', d.key);
  insert into game.furnishings (player_id, slot, item, paid_cents, at) values (v_player, d.slot, d.key, v_price, private.now())
  on conflict (player_id, slot) do update set item = excluded.item, paid_cents = excluded.paid_cents, at = excluded.at;
  delete from game.modifiers where player_id = v_player and source = 'furniture:' || d.slot;
  insert into game.modifiers (player_id, source, stat, op, value) values (v_player, 'furniture:' || d.slot, d.stat, d.op, d.value);
  perform private.emit(v_player, 'furniture_bought');
  return private.request_done(v_player, p_request_id, private.housing_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.furniture_buy(uuid, text)');

-- Gästebuch: one entry per visitor and host per day; the host can delete entries.
create function private.guestbook_doc(p_host uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'author_id', g.author_id, 'name', p.username, 'body', g.body, 'at', g.at)
    order by g.id desc), '[]'::jsonb)
  from (select * from game.guestbook where host_id = p_host order by id desc limit 30) g
  left join game.players p on p.id = g.author_id
$$;

create function public.guestbook_sign(p_request_id uuid, p_host uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'guestbook_sign');
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if p_host is null or p_host = v_player or not exists (select 1 from game.players where id = p_host) then
    perform private.fail('invalid_request');
  end if;
  if length(v_body) = 0 or length(v_body) > private.cfg_num('guestbook.max_len') then
    perform private.fail('invalid_request');
  end if;
  if (select count(*) from game.guestbook where host_id = p_host and author_id = v_player
      and (at at time zone 'Europe/Berlin')::date = private.today()) >= private.cfg_num('guestbook.per_day') then
    perform private.fail('rate_limited');
  end if;
  insert into game.guestbook (host_id, author_id, body, at) values (p_host, v_player, v_body, private.now());
  perform private.notify(p_host, 'guestbook', jsonb_build_object('name', (select username from game.players where id = v_player)));
  perform private.emit(v_player, 'guestbook_signed');
  return private.request_done(v_player, p_request_id, jsonb_build_object('guestbook', private.guestbook_doc(p_host)));
end $$;
select private.expose('public.guestbook_sign(uuid, uuid, text)');

create function public.guestbook_delete(p_request_id uuid, p_entry bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'guestbook_delete');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  delete from game.guestbook where id = p_entry and host_id = v_player;
  if not found then
    perform private.fail('not_found');
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object('guestbook', private.guestbook_doc(v_player)));
end $$;
select private.expose('public.guestbook_delete(uuid, bigint)');

-- Nebenkosten: once per German day, at most the cash there is.
create function private.tick_housing() returns void
language plpgsql set search_path = '' as $$
declare
  r record;
  v_cost bigint;
begin
  for r in
    select h.player_id, d.price_base_cents from game.homes h join game.home_defs d on d.tier = h.tier
    where h.tier > 0 and (h.charged_day is null or h.charged_day < private.today())
  loop
    begin
      v_cost := least((select cash_cents from game.players where id = r.player_id),
                      round(private.eur(r.price_base_cents) * private.cfg_num('housing.nebenkosten_bps') / 10000)::bigint);
      if v_cost > 0 then
        perform private.money_add(r.player_id, -v_cost, 'nebenkosten');
        perform private.notify(r.player_id, 'nebenkosten', jsonb_build_object('cents', v_cost));
      end if;
      update game.homes set charged_day = private.today() where player_id = r.player_id;
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('housing', private.now(), 0, false, sqlerrm);
    end;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('housing', 600);

-- Net worth with half of what home and furnishing cost.
create or replace function private.net_worth(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select least(9000000000000000, (
      (select cash_cents from game.players where id = p_player)
    + coalesce(private.eur(private.bunker_content_base(p_player)), 0)
    + (select coalesce(sum(private.card_value(card_id) * qty), 0) from game.card_stacks where player_id = p_player)
    + (select coalesce(sum(private.slab_value(card_id, grader, grade, black_label)), 0) from game.card_copies where owner_id = p_player)
    + (select coalesce(sum(private.product_value(product_id) * qty), 0) from game.sealed where player_id = p_player)
    + (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.listings
       where seller_id = p_player and item_kind <> 'copy')
    + (select coalesce(sum(price_cents * qty), 0) from game.buy_orders where buyer_id = p_player)
    + (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.shipments
       where buyer_id = p_player and item_kind <> 'copy')
    + (select coalesce(sum(total_cents - fee_cents), 0) from game.shipments where seller_id = p_player)
    + (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.ads
       where seller_id = p_player and item_kind <> 'copy')
    + (select coalesce(sum(paid_cents), 0) from game.homes where player_id = p_player) * private.cfg_num('housing.refund_bps') / 10000
    + (select coalesce(sum(paid_cents), 0) from game.furnishings where player_id = p_player) * private.cfg_num('housing.refund_bps') / 10000
  )::numeric)::bigint
$$;

-- Profile with home, Wohnwert, furnishing and Gästebuch (visits).
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
    'vitrine', private.vitrine_doc(p.id),
    'slots', private.vitrine_slots(p.id),
    'unlocked', p.level >= private.cfg_num('unlock.grading'),
    'stats', jsonb_build_object(
      'pack_opened', coalesce((select total from game.counters where player_id = p.id and event = 'pack_opened'), 0),
      'graded', coalesce((select total from game.counters where player_id = p.id and event = 'graded'), 0),
      'graded_10', coalesce((select total from game.counters where player_id = p.id and event = 'graded_10'), 0),
      'collection', private.collection_count(p.id)
    ),
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
