-- alpha_05 (Vier Spiele), part 1: starter choice and Händlerlizenzen (docs/GAME_DESIGN.md §22). A new player
-- picks a favourite game in the first tutorial step and gets its licence and Opa's booster from it; the other
-- games open as licences at the levels in `license.levels` for a fee. Buying sealed product in the Kiosk and in
-- stores needs the game's licence; markets, ads and trades stay open to everything. Reward boosters come from
-- the favourite game.

alter table game.players add column fav_game text;

create table game.licenses (
  player_id uuid not null references game.players (id) on delete cascade,
  game text not null,
  at timestamptz not null,
  primary key (player_id, game)
);
alter table game.licenses enable row level security;

-- Everybody who played before the choice existed collected Pokémon.
insert into game.licenses (player_id, game, at) select id, 'pokemon', created_at from game.players;
update game.players set fav_game = 'pokemon' where fav_game is null;

create function private.product_game(p_product text) returns text
language sql stable set search_path = '' as $$
  select s.game from game.product_defs pd join game.set_defs s on s.id = pd.set_id where pd.id = p_product
$$;

create function private.has_license(p_player uuid, p_game text) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from game.licenses where player_id = p_player and game = p_game)
$$;

-- How many licences the player's level allows: the favourite plus one per reached licence level.
create function private.licenses_allowed(p_player uuid) returns int
language sql stable set search_path = '' as $$
  select 1 + (
    select count(*)::int from jsonb_array_elements_text(private.cfg('license.levels')) l
    where l::int <= (select level from game.players where id = p_player)
  )
$$;

-- Fee of the player's next licence (null when none is left).
create function private.license_fee(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select private.eur((private.cfg('license.fees_base_cents') ->> ((select count(*) from game.licenses where player_id = p_player)::int - 1))::numeric)
$$;

-- The booster of the player's favourite game (reward boosters).
create function private.reward_booster(p_player uuid) returns text
language sql stable set search_path = '' as $$
  select coalesce(
    (select pd.id from game.players p
     join game.set_defs s on s.game = p.fav_game
     join game.product_defs pd on pd.set_id = s.id and pd.kind = 'booster'
     where p.id = p_player order by s.id, pd.id limit 1),
    private.cfg('reward.default_product') #>> '{}')
$$;

-- Sealed into the inventory (replaces the alpha_02 version): 'reward-booster' becomes the favourite game's booster.
create or replace function private.sealed_add(p_player uuid, p_product text, p_qty int) returns void
language sql set search_path = '' as $$
  insert into game.sealed (player_id, product_id, qty)
  values (p_player, case when p_product = 'reward-booster' then private.reward_booster(p_player) else p_product end, p_qty)
  on conflict (player_id, product_id) do update set qty = game.sealed.qty + excluded.qty
$$;

-- Kiosk and store purchases need the licence of the product's game (both purchase paths record here).
create function private.on_purchase_license() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not private.has_license(new.player_id, private.product_game(new.product_id)) then
    perform private.fail('no_license');
  end if;
  return new;
end $$;
create trigger store_purchases_license before insert on game.store_purchases
  for each row execute function private.on_purchase_license();
create trigger store_buys_license before insert on game.store_buys
  for each row execute function private.on_purchase_license();

create function private.licenses_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'fav_game', (select fav_game from game.players where id = p_player),
    'owned', (select coalesce(jsonb_agg(game order by at), '[]'::jsonb) from game.licenses where player_id = p_player),
    'allowed', private.licenses_allowed(p_player),
    'levels', private.cfg('license.levels'),
    'next_fee_cents', private.license_fee(p_player)
  )
$$;

-- The first licence: free, sets the favourite game; completes the first tutorial step (Opa's booster).
create function public.starter_pick(p_request_id uuid, p_game text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'starter_pick');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform 1 from game.players where id = v_player for update;
  if not exists (select 1 from game.set_defs where game = p_game)
     or exists (select 1 from game.licenses where player_id = v_player) then
    perform private.fail('invalid_request');
  end if;
  insert into game.licenses (player_id, game, at) values (v_player, p_game, private.now());
  update game.players set fav_game = p_game where id = v_player;
  perform private.emit(v_player, 'starter_picked');
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'licenses', private.licenses_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.starter_pick(uuid, text)');

create function public.license_buy(p_request_id uuid, p_game text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'license_buy');
  v_fee bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'buy', private.cfg_num('rate.buy')::int, 60);
  perform 1 from game.players where id = v_player for update;
  if not exists (select 1 from game.set_defs where game = p_game) or private.has_license(v_player, p_game)
     or not exists (select 1 from game.licenses where player_id = v_player) then
    perform private.fail('invalid_request');
  end if;
  if (select count(*) from game.licenses where player_id = v_player) >= private.licenses_allowed(v_player) then
    perform private.fail('locked');
  end if;
  v_fee := private.license_fee(v_player);
  perform private.money_add(v_player, -v_fee, 'license', p_game);
  insert into game.licenses (player_id, game, at) values (v_player, p_game, private.now());
  perform private.emit(v_player, 'license_bought');
  perform private.feed_add('license', jsonb_build_object(
    'name', (select username from game.players where id = v_player), 'game', p_game));
  return private.request_done(v_player, p_request_id, jsonb_build_object(
    'licenses', private.licenses_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.license_buy(uuid, text)');

-- A reset starts over with a new pick.
create function private.on_player_reset_licenses() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.licenses where player_id = new.id;
    update game.players set fav_game = null where id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_licenses after update of reset_at on game.players
  for each row execute function private.on_player_reset_licenses();

create function public.licenses_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return private.licenses_doc(v_player);
end $$;
select private.expose('public.licenses_get()');
