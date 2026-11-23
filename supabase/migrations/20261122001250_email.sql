-- Owner request (23 Nov 2026): players register with e-mail, username and password (plus the shared invite code) and
-- can log in with the e-mail or the username. The address is not verified and no mail is ever sent. It lives in
-- game.credentials, next to the password hash, so it never reaches a player document, the feed or a list; only its
-- owner reads it (account_get). Unique regardless of upper and lower case. Accounts from before keep working and can
-- add an address on their profile.

alter table game.credentials add column email text;
alter table game.credentials add column email_key text generated always as (lower(email)) stored;
create unique index credentials_email_key on game.credentials (email_key);

-- Trimmed address, or a failure: one @, a dot in the domain, no spaces, at most 254 characters.
create function private.email_clean(p_email text) returns text
language plpgsql stable set search_path = '' as $$
declare
  v text := btrim(coalesce(p_email, ''));
begin
  if length(v) > 254 or v !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    perform private.fail('email_invalid');
  end if;
  return v;
end $$;

drop function public.join(text, text, text);

-- Registers a new player and signs this browser in. One shared invite code: the very first account sets it (and
-- becomes admin); everyone after must enter the same code.
create function public.join(p_username text, p_password text, p_invite_code text, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_username, ''));
  v_email text;
  v_hash text;
  v_srv game.server;
  v_first boolean;
  v_player uuid;
  v_now timestamptz := private.now();
begin
  if auth.uid() is null then
    perform private.fail('not_authenticated');
  end if;
  v_email := private.email_clean(p_email);
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
  if exists (select 1 from game.credentials where email_key = lower(v_email)) then
    perform private.fail('email_taken');
  end if;

  insert into game.players (username, is_admin, energy_at, created_at, last_seen_at)
  values (v_name, v_first, v_now, v_now, v_now)
  returning id into v_player;

  insert into game.credentials (player_id, password_hash, email)
  values (v_player, extensions.crypt(p_password, extensions.gen_salt('bf', private.cfg_num('auth.bcrypt_cost')::int)), v_email);

  perform private.session_bind(v_player);
  perform private.money_add(v_player, private.eur(private.cfg_num('start.cash_base_cents')), 'start_capital');
  perform private.feed_add('player_joined', jsonb_build_object('name', v_name));

  return public.me_get();
end $$;
select private.expose('public.join(text, text, text, text)');

-- Signs this browser in as an existing player, by e-mail (anything with an @) or username. Failures are returned, not
-- raised, so the failed attempt is stored: after too many wrong passwords the account is locked for a few minutes.
create or replace function public.login(p_username text, p_password text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := lower(btrim(coalesce(p_username, '')));
  v_player uuid;
  c game.credentials;
  v_now timestamptz := private.now();
begin
  if auth.uid() is null then
    perform private.fail('not_authenticated');
  end if;

  if position('@' in v_name) > 0 then
    select player_id into v_player from game.credentials where email_key = v_name;
  else
    select id into v_player from game.players where username_key = v_name;
  end if;
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

-- The signed-in player's own account data (only the e-mail for now; null for accounts from before).
create function public.account_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object('email', (select email from game.credentials where player_id = v_player));
end $$;
select private.expose('public.account_get()');

-- Sets or changes the e-mail. Like the rest of the account it needs no confirmation mail.
create function public.account_email_set(p_request_id uuid, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'account_email_set');
  v_email text;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'email', private.cfg_num('rate.email')::int, 3600);
  v_email := private.email_clean(p_email);
  if exists (select 1 from game.credentials where email_key = lower(v_email) and player_id <> v_player) then
    perform private.fail('email_taken');
  end if;
  update game.credentials set email = v_email where player_id = v_player;
  return private.request_done(v_player, p_request_id, jsonb_build_object('email', v_email));
end $$;
select private.expose('public.account_email_set(uuid, text)');
