-- alpha_07 (Leben), part 3: Stil (docs/GAME_DESIGN.md §15). Cosmetics from content/cosmetics.ts are bought once and
-- equipped per kind (players.style); bought titles join the achievement titles. The profile picture is the artwork
-- of any card the player owns (players.avatar_card). Friends see name colour, frame and picture in the players
-- list, the Stammtisch, toplists and on profiles.

alter table game.players
  add column style jsonb not null default '{}',
  add column avatar_card text references game.card_defs (id);
create index players_avatar_card on game.players (avatar_card);

create table game.cosmetic_defs (
  key text primary key,
  kind text not null,
  min_level int not null,
  price_base_cents bigint not null,
  title text
);

create table game.cosmetics_owned (
  player_id uuid not null references game.players (id) on delete cascade,
  key text not null references game.cosmetic_defs (key) on delete cascade,
  at timestamptz not null,
  primary key (player_id, key)
);
create index cosmetics_owned_key on game.cosmetics_owned (key);

alter table game.cosmetic_defs enable row level security;
alter table game.cosmetics_owned enable row level security;

-- A reset sells nothing back: bought cosmetics, style and picture are gone.
create function private.on_player_reset_cosmetics() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.cosmetics_owned where player_id = new.id;
    update game.players set style = '{}', avatar_card = null where id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_cosmetics after update of reset_at on game.players
  for each row execute function private.on_player_reset_cosmetics();

-- What others see of a player.
create function private.look(p game.players) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('name_color', p.style ->> 'name_color', 'frame', p.style ->> 'frame', 'avatar_card', p.avatar_card)
$$;

-- Titles from achievements, then bought ones.
create or replace function private.titles_of(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(x.title order by x.ord, x.k, x.i), '[]'::jsonb) from (
    select t.title, 0 as ord, a.key as k, t.i
    from game.achievements a
    join game.achievement_defs d on d.key = a.key
    cross join lateral (
      select value #>> '{}' as title, i from jsonb_array_elements(d.titles) with ordinality as x(value, i)
    ) t
    where a.player_id = p_player and t.i <= a.tier and t.title is not null
    union all
    select d.title, 1, d.key, 0
    from game.cosmetics_owned o join game.cosmetic_defs d on d.key = o.key
    where o.player_id = p_player and d.kind = 'title'
  ) x
$$;

-- Does the player own the card right now (bulk stack or any copy)?
create function private.owns_card(p_player uuid, p_card text) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from game.card_stacks where player_id = p_player and card_id = p_card and qty > 0)
      or exists (select 1 from game.card_copies where owner_id = p_player and card_id = p_card)
$$;

create function private.cosmetics_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.style')::int,
    'owned', coalesce((select jsonb_agg(o.key order by o.at) from game.cosmetics_owned o where o.player_id = p.id), '[]'::jsonb),
    'style', p.style,
    'avatar_card', p.avatar_card,
    'title', p.title,
    'cards', coalesce((select jsonb_agg(distinct c.card_id) from (
      select card_id from game.card_stacks where player_id = p.id and qty > 0
      union select card_id from game.card_copies where owner_id = p.id) c), '[]'::jsonb),
    'items', (select jsonb_agg(jsonb_build_object('key', d.key, 'price_cents', private.eur(d.price_base_cents)) order by d.key) from game.cosmetic_defs d)
  )
  from game.players p where p.id = p_player
$$;

create function public.cosmetics_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return private.cosmetics_doc(v_player);
end $$;
select private.expose('public.cosmetics_get()');

create function public.cosmetic_buy(p_request_id uuid, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'cosmetic_buy');
  d game.cosmetic_defs;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'style');
  select * into d from game.cosmetic_defs where key = p_key;
  if not found then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  if (select level from game.players where id = v_player) < d.min_level then
    perform private.fail('locked');
  end if;
  if exists (select 1 from game.cosmetics_owned where player_id = v_player and key = p_key) then
    perform private.fail('already_owned');
  end if;
  perform private.money_add(v_player, -private.eur(d.price_base_cents), 'cosmetic', d.key);
  insert into game.cosmetics_owned (player_id, key, at) values (v_player, p_key, private.now());
  perform private.emit(v_player, 'cosmetic_bought');
  return private.request_done(v_player, p_request_id, private.cosmetics_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.cosmetic_buy(uuid, text)');

-- Wear an owned look of a kind, or take it off (p_key null). Titles go through title_set.
create function public.cosmetic_equip(p_request_id uuid, p_kind text, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'cosmetic_equip');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if p_kind is null or p_kind not in ('name_color', 'frame', 'sleeve', 'binder', 'pack_fx') then
    perform private.fail('invalid_request');
  end if;
  if p_key is not null and not exists (
    select 1 from game.cosmetics_owned o join game.cosmetic_defs d on d.key = o.key
    where o.player_id = v_player and o.key = p_key and d.kind = p_kind
  ) then
    perform private.fail('not_owned');
  end if;
  update game.players
  set style = case when p_key is null then style - p_kind else style || jsonb_build_object(p_kind, p_key) end
  where id = v_player;
  return private.request_done(v_player, p_request_id, private.cosmetics_doc(v_player));
end $$;
select private.expose('public.cosmetic_equip(uuid, text, text)');

-- The profile picture: the artwork of any card the player owns (null clears it).
create function public.avatar_set(p_request_id uuid, p_card text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'avatar_set');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if p_card is not null and not private.owns_card(v_player, p_card) then
    perform private.fail('not_owned');
  end if;
  update game.players set avatar_card = p_card where id = v_player;
  return private.request_done(v_player, p_request_id, private.cosmetics_doc(v_player));
end $$;
select private.expose('public.avatar_set(uuid, text)');

-- ---------------------------------------------------------------------------------------------
-- The look wherever friends see a player
-- ---------------------------------------------------------------------------------------------
create or replace function public.players_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_now timestamptz := private.now();
begin
  return jsonb_build_object('players', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', p.username,
      'title', p.title,
      'level', p.level,
      'online', p.id = v_player or p.last_seen_at > v_now - make_interval(secs => private.cfg_num('presence.online_seconds')),
      'last_seen_at', p.last_seen_at,
      'me', p.id = v_player,
      'locked_until', private.trade_lock_until(p),
      'is_admin', p.is_admin,
      'look', private.look(p)
    ) order by p.last_seen_at desc), '[]'::jsonb)
    from game.players p
  ), 'trades', private.trades_doc(v_player));
end $$;

create or replace function private.chat_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'messages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', p.username,
        'level', p.level,
        'title', p.title,
        'me', coalesce(c.player_id = p_player, false),
        'body', c.body,
        'item_id', c.item_id,
        'at', c.at,
        'look', case when p.id is not null then private.look(p) end
      ) order by c.id), '[]'::jsonb)
      from (select * from game.chat order by id desc limit 100) c
      left join game.players p on p.id = c.player_id
    ),
    'online', (
      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.username, 'level', p.level) order by p.username), '[]'::jsonb)
      from game.players p
      where p.id = p_player or p.last_seen_at > private.now() - make_interval(secs => private.cfg_num('presence.online_seconds'))
    )
  )
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
