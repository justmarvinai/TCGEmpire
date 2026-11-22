-- Local/test only. Provides the few Supabase objects our migrations rely on.
-- Never applied to a real Supabase project.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;

-- Supabase keeps pgcrypto in the `extensions` schema.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- auth.uid(): the id of the (anonymous) Supabase auth user making the request.
create schema if not exists auth;
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- realtime.send(payload, event, topic, private): Supabase Realtime Broadcast from the database. Locally a
-- pg_notify on channel 'realtime' that the local backend listens to.
create schema if not exists realtime;
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void
language sql as $$
  select pg_notify('realtime', jsonb_build_object('topic', topic, 'event', event, 'payload', payload)::text)
$$;
