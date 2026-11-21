-- Session API: join, me, sync.

create function private.player_doc(r game.players) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id,
    'username', r.username,
    'cash_cents', r.cash_cents,
    'level', r.level,
    'ep', r.ep,
    'ep_to_next', case when r.level < 100 then private.ep_to_next(r.level) end,
    'skill_points', r.skill_points,
    'ruf', r.ruf,
    'pfandbons', r.pfandbons,
    'energy', r.energy,
    'energy_max', private.cfg_num('energy.max'),
    'prestige', r.prestige,
    'stars', r.stars,
    'is_admin', r.is_admin,
    'created_at', r.created_at
  )
$$;

create function private.server_doc() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'time', private.now(),
    'version', private.cfg('version') #>> '{}',
    'price_level', s.price_level,
    'has_invite_code', s.invite_code_hash is not null
  )
  from game.server s where s.id
$$;

-- The signed-in user's player (null until they joined) plus server info.
create function public.me_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r game.players;
begin
  if v_uid is null then
    perform private.fail('not_authenticated');
  end if;
  select * into r from game.players where id = v_uid;
  return jsonb_build_object(
    'player', case when found then private.player_doc(r) end,
    'server', private.server_doc()
  );
end $$;
select private.expose('public.me_get()');

-- Creates the player for the signed-in user. One shared invite code: the very first account sets it
-- (and becomes admin); everyone after must enter the same code.
create function public.join(p_username text, p_invite_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_username, ''));
  v_hash text;
  v_srv game.server;
  v_first boolean;
  v_now timestamptz := private.now();
begin
  if v_uid is null then
    perform private.fail('not_authenticated');
  end if;
  if exists (select 1 from game.players where id = v_uid) then
    return public.me_get();
  end if;
  if v_name !~ '^[A-Za-z0-9_ÄÖÜäöüß-]{3,16}$' then
    perform private.fail('username_invalid');
  end if;
  if p_invite_code is null or length(p_invite_code) not between 4 and 64 then
    perform private.fail('invite_invalid');
  end if;

  select * into v_srv from game.server where id for update; -- serialises joins
  v_hash := encode(sha256(convert_to(p_invite_code, 'UTF8')), 'hex');
  v_first := not exists (select 1 from game.players);

  if v_srv.invite_code_hash is null then
    update game.server set invite_code_hash = v_hash where id;
  elsif v_srv.invite_code_hash <> v_hash then
    perform private.fail('invite_wrong');
  end if;

  if exists (select 1 from game.players where username_key = lower(v_name)) then
    perform private.fail('username_taken');
  end if;

  insert into game.players (id, username, is_admin, energy_at, created_at, last_seen_at)
  values (v_uid, v_name, v_first, v_now, v_now, v_now);

  perform private.money_add(v_uid, private.eur(private.cfg_num('start.cash_base_cents')), 'start_capital');
  perform private.feed_add('player_joined', jsonb_build_object('name', v_name));

  return public.me_get();
end $$;
select private.expose('public.join(text, text)');

-- The one polling call: own state, new notifications, new feed entries, server time.
create function public.sync(p_after_notification bigint default 0, p_after_feed bigint default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_now timestamptz := private.now();
begin
  update game.players set last_seen_at = v_now
  where id = v_player and last_seen_at < v_now - interval '60 seconds';

  return public.me_get() || jsonb_build_object(
    'notifications', (
      select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'data', n.data, 'at', n.at) order by n.id), '[]'::jsonb)
      from (
        select * from game.notifications
        where player_id = v_player and id > p_after_notification
        order by id desc limit 50
      ) n
    ),
    'feed', (
      select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'kind', f.kind, 'data', f.data, 'at', f.at) order by f.id), '[]'::jsonb)
      from (
        select * from game.feed where id > p_after_feed order by id desc limit 30
      ) f
    )
  );
end $$;
select private.expose('public.sync(bigint, bigint)');
