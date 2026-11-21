-- Session API: join, login, logout, me, sync.

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

-- The player this browser is signed in as (null if none) plus server info.
create function public.me_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r game.players;
begin
  if auth.uid() is null then
    perform private.fail('not_authenticated');
  end if;
  select * into r from game.players where id = private.current_player();
  return jsonb_build_object(
    'player', case when found then private.player_doc(r) end,
    'server', private.server_doc()
  );
end $$;
select private.expose('public.me_get()');

create function private.session_bind(p_player uuid) returns void
language sql set search_path = '' as $$
  insert into game.sessions (auth_uid, player_id, created_at, last_used_at)
  values (auth.uid(), p_player, private.now(), private.now())
  on conflict (auth_uid) do update set player_id = excluded.player_id, last_used_at = excluded.last_used_at
$$;

-- Registers a new player and signs this browser in. One shared invite code: the very first account
-- sets it (and becomes admin); everyone after must enter the same code.
create function public.join(p_username text, p_password text, p_invite_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_username, ''));
  v_hash text;
  v_srv game.server;
  v_first boolean;
  v_player uuid;
  v_now timestamptz := private.now();
begin
  if auth.uid() is null then
    perform private.fail('not_authenticated');
  end if;
  if v_name !~ '^[A-Za-z0-9_ÄÖÜäöüß-]{3,16}$' then
    perform private.fail('username_invalid');
  end if;
  if p_password is null or length(p_password) not between 6 and 72 then
    perform private.fail('password_invalid');
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

  insert into game.players (username, is_admin, energy_at, created_at, last_seen_at)
  values (v_name, v_first, v_now, v_now, v_now)
  returning id into v_player;

  insert into game.credentials (player_id, password_hash)
  values (v_player, extensions.crypt(p_password, extensions.gen_salt('bf', private.cfg_num('auth.bcrypt_cost')::int)));

  perform private.session_bind(v_player);
  perform private.money_add(v_player, private.eur(private.cfg_num('start.cash_base_cents')), 'start_capital');
  perform private.feed_add('player_joined', jsonb_build_object('name', v_name));

  return public.me_get();
end $$;
select private.expose('public.join(text, text, text)');

-- Signs this browser in as an existing player. Failures are returned, not raised, so the failed
-- attempt is stored: after too many wrong passwords the account is locked for a few minutes.
create function public.login(p_username text, p_password text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid;
  c game.credentials;
  v_now timestamptz := private.now();
begin
  if auth.uid() is null then
    perform private.fail('not_authenticated');
  end if;

  select id into v_player from game.players where username_key = lower(btrim(coalesce(p_username, '')));
  select * into c from game.credentials where player_id = v_player for update;
  if not found then
    return jsonb_build_object('error', 'login_wrong');
  end if;
  if c.locked_until is not null and c.locked_until > v_now then
    return jsonb_build_object('error', 'login_locked');
  end if;

  if p_password is null or c.password_hash <> extensions.crypt(left(p_password, 72), c.password_hash) then
    update game.credentials
    set failed_count = case when failed_count + 1 >= private.cfg_num('auth.max_failures') then 0 else failed_count + 1 end,
        locked_until = case when failed_count + 1 >= private.cfg_num('auth.max_failures')
                            then v_now + make_interval(secs => private.cfg_num('auth.lock_seconds')) end
    where player_id = v_player;
    return jsonb_build_object('error', 'login_wrong');
  end if;

  update game.credentials set failed_count = 0, locked_until = null where player_id = v_player;
  perform private.session_bind(v_player);
  return jsonb_build_object('error', null) || public.me_get();
end $$;
select private.expose('public.login(text, text)');

create function public.logout() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    perform private.fail('not_authenticated');
  end if;
  delete from game.sessions where auth_uid = auth.uid();
  return public.me_get();
end $$;
select private.expose('public.logout()');

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
