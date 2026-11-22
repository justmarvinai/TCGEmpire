-- alpha_04 (Flip), part 9: set lifecycle and admin console v1 (docs/GAME_DESIGN.md §4.5, §23). Only the admin
-- moves a set between phases; going out of print freezes the sealed supply at that moment (the scarcity
-- reference of the market) and a reprint undoes it. The console also restocks a store at once, changes the
-- invite code, overrides config values live, shows the tick log, money in and out per reason, all players,
-- grants compensation and posts announcements to KARTEN-BILD.

create function private.require_admin() returns uuid
language plpgsql stable set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  if not (select is_admin from game.players where id = v_player) then
    perform private.fail('forbidden');
  end if;
  return v_player;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Document
-- ---------------------------------------------------------------------------------------------
create function private.admin_doc() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'sets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'phase', s.phase, 'phase_at', s.phase_at, 'oop_at', s.oop_at,
        'packs_opened', s.packs_opened, 'sealed_left', private.sealed_left(s.id), 'sealed_at_oop', s.sealed_at_oop
      ) order by s.id), '[]'::jsonb)
      from game.set_defs s
    ),
    'stores', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', d.key,
        'due_at', private.store_due(d.key),
        'waves', (
          select coalesce(jsonb_agg(jsonb_build_object('product_id', w.product_id, 'wave_at', w.wave_at, 'qty_total', w.qty_total, 'qty_left', w.qty_left)), '[]'::jsonb)
          from game.store_waves w where w.store = d.key
        )
      ) order by d.key), '[]'::jsonb)
      from game.store_defs d where jsonb_array_length(d.restocks) > 0
    ),
    'price_level', (select price_level from game.server where id),
    'config', (
      select jsonb_agg(jsonb_build_object('key', c.key, 'value', c.value, 'override', o.value) order by c.key)
      from game.config c left join game.config_overrides o on o.key = c.key
    ),
    'systems', (
      select jsonb_agg(jsonb_build_object(
        'name', t.name, 'every_seconds', t.every_seconds, 'last_run_at', t.last_run_at, 'enabled', t.enabled,
        'failed_24h', (select count(*) from game.job_runs r where r.name = t.name and not r.ok and r.started_at > private.now() - interval '24 hours')
      ) order by t.name)
      from game.tick_systems t
    ),
    'job_runs', (
      select coalesce(jsonb_agg(jsonb_build_object('name', r.name, 'started_at', r.started_at, 'ms', r.ms, 'ok', r.ok, 'error', r.error) order by r.ok, r.id desc), '[]'::jsonb)
      from (select * from game.job_runs order by ok, id desc limit 40) r
    ),
    'economy', (
      select coalesce(jsonb_agg(jsonb_build_object('day', e.day, 'reason', e.reason, 'cents', e.cents, 'n', e.n) order by e.day desc, e.cents desc), '[]'::jsonb)
      from (
        select day, reason, sum(sum_cents)::bigint as cents, sum(n)::bigint as n
        from game.ledger_daily where day > private.today() - 7
        group by day, reason
      ) e
    ),
    'players', (
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.username, 'level', p.level, 'cash_cents', p.cash_cents, 'net_worth_cents', private.net_worth(p.id),
        'created_at', p.created_at, 'last_seen_at', p.last_seen_at, 'is_admin', p.is_admin
      ) order by p.last_seen_at desc)
      from game.players p
    )
  )
$$;

create function public.admin_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return private.admin_doc();
end $$;
select private.expose('public.admin_get()');

-- ---------------------------------------------------------------------------------------------
-- Writes (each returns the fresh console document)
-- ---------------------------------------------------------------------------------------------

-- Any phase change is allowed (the admin knows what they do); out of print snapshots the sealed supply,
-- a step back into print or earlier is a reprint and clears it.
create function public.admin_set_phase(p_request_id uuid, p_set text, p_phase text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_admin();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'admin_set_phase');
  s game.set_defs;
  v_order text[] := array['announced', 'preorder', 'print', 'last_wave', 'oop', 'vintage'];
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into s from game.set_defs where id = p_set for update;
  if not found or array_position(v_order, p_phase) is null or s.phase = p_phase then
    perform private.fail('invalid_request');
  end if;
  update game.set_defs set
    phase = p_phase,
    phase_at = private.now(),
    oop_at = case when p_phase in ('oop', 'vintage') then coalesce(s.oop_at, private.now()) end,
    sealed_at_oop = case when p_phase in ('oop', 'vintage') then coalesce(s.sealed_at_oop, private.sealed_left(p_set)) end
  where id = p_set;
  perform private.feed_add('set_phase', jsonb_build_object(
    'set_id', p_set, 'phase', p_phase,
    'reprint', array_position(v_order, p_phase) < array_position(v_order, s.phase) and s.phase in ('oop', 'vintage')));
  return private.request_done(v_player, p_request_id, private.admin_doc());
end $$;
select private.expose('public.admin_set_phase(uuid, text, text)');

-- A restock right now, outside the schedule (same size rule as the tick; scalpers join on the next tick).
create function public.admin_restock(p_request_id uuid, p_store text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_admin();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'admin_restock');
  s game.store_defs;
  v_active int := greatest(2, (select count(*) from game.players where last_seen_at > private.now() - interval '72 hours')::int);
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into s from game.store_defs where key = p_store and jsonb_array_length(restocks) > 0;
  if not found then
    perform private.fail('invalid_request');
  end if;
  insert into game.store_waves (store, product_id, wave_at, qty_total, qty_left, npc_taken)
  select s.key, p ->> 'id', private.now(), s.stock_per_player * v_active, s.stock_per_player * v_active, 0
  from jsonb_array_elements(s.products) p
  join game.product_defs pd on pd.id = p ->> 'id'
  join game.set_defs sd on sd.id = pd.set_id and sd.phase in ('print', 'last_wave')
  on conflict (store, product_id) do update
    set wave_at = excluded.wave_at, qty_total = excluded.qty_total, qty_left = excluded.qty_left, npc_taken = 0;
  perform private.feed_add('restock', jsonb_build_object('store', s.key));
  return private.request_done(v_player, p_request_id, private.admin_doc());
end $$;
select private.expose('public.admin_restock(uuid, text)');

create function public.admin_invite_set(p_request_id uuid, p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_admin();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'admin_invite_set');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if p_code is null or length(p_code) not between 4 and 64 then
    perform private.fail('invite_invalid');
  end if;
  update game.server set invite_code_hash = encode(sha256(convert_to(p_code, 'UTF8')), 'hex') where id;
  return private.request_done(v_player, p_request_id, private.admin_doc());
end $$;
select private.expose('public.admin_invite_set(uuid, text)');

-- Overrides a config value live (same JSON type as the default); null removes the override.
create function public.admin_config_set(p_request_id uuid, p_key text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_admin();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'admin_config_set');
  v_default jsonb := (select value from game.config where key = p_key);
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if v_default is null or (p_value is not null and jsonb_typeof(p_value) <> jsonb_typeof(v_default)) then
    perform private.fail('invalid_request');
  end if;
  if p_value is null or p_value = v_default then
    delete from game.config_overrides where key = p_key;
  else
    insert into game.config_overrides (key, value, updated_at) values (p_key, p_value, private.now())
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
  end if;
  return private.request_done(v_player, p_request_id, private.admin_doc());
end $$;
select private.expose('public.admin_config_set(uuid, text, jsonb)');

-- Compensation after a bug: money from nowhere, booked as its own source.
create function public.admin_grant(p_request_id uuid, p_player uuid, p_cents bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := private.require_admin();
  v_replay jsonb := private.request_begin(v_admin, p_request_id, 'admin_grant');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if coalesce(p_cents, 0) < 1 or not exists (select 1 from game.players where id = p_player) then
    perform private.fail('invalid_request');
  end if;
  perform private.money_add(p_player, p_cents, 'admin_grant', v_admin::text);
  perform private.notify(p_player, 'admin_grant', jsonb_build_object('cents', p_cents));
  return private.request_done(v_admin, p_request_id, private.admin_doc());
end $$;
select private.expose('public.admin_grant(uuid, uuid, bigint)');

create function public.admin_announce(p_request_id uuid, p_text text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_admin();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'admin_announce');
  v_text text := btrim(coalesce(p_text, ''));
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if v_text = '' or char_length(v_text) > 280 then
    perform private.fail('invalid_request');
  end if;
  perform private.feed_add('announcement', jsonb_build_object('text', v_text));
  return private.request_done(v_player, p_request_id, private.admin_doc());
end $$;
select private.expose('public.admin_announce(uuid, text)');
