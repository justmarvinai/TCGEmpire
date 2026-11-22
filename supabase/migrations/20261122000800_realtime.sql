-- alpha_08 (Freunde), part 1: the Realtime layer (docs/ARCHITECTURE.md §7). The database sends small "pokes" over
-- Supabase Realtime Broadcast in the same transaction as the change; clients then fetch through the normal RPCs.
-- Polling stays the safety net, so nothing depends on Realtime. Topics:
--   world               feed headlines and Stammtisch messages (every signed-in player)
--   player:<rt_topic>   this player's notifications; rt_topic is a random id only the player learns
--   battle:<id>         one pack battle or box break
-- Locally (PGlite) the shim turns realtime.send into pg_notify, which the local backend listens to.

alter table game.players add column rt_topic uuid not null default gen_random_uuid();

-- Sends one broadcast; Realtime trouble must never break the game.
create function private.rt_send(p_topic text, p_event text, p_payload jsonb) returns void
language plpgsql set search_path = '' as $$
begin
  perform realtime.send(p_payload, p_event, p_topic, true);
exception when others then
  null;
end $$;

create function private.on_notification_rt() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform private.rt_send('player:' || (select rt_topic from game.players where id = new.player_id), 'poke',
    jsonb_build_object('area', 'notifications'));
  return null;
end $$;
create trigger notifications_rt after insert on game.notifications
  for each row execute function private.on_notification_rt();

create function private.on_feed_rt() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform private.rt_send('world', 'poke', jsonb_build_object('area', 'feed'));
  return null;
end $$;
create trigger feed_rt after insert on game.feed
  for each row execute function private.on_feed_rt();

create function private.on_chat_rt() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform private.rt_send('world', 'poke', jsonb_build_object('area', 'chat'));
  return null;
end $$;
create trigger chat_rt after insert on game.chat
  for each row execute function private.on_chat_rt();

-- The topics a signed-in player listens to.
create function public.realtime_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object('world', 'world', 'player', 'player:' || (select rt_topic from game.players where id = v_player));
end $$;
select private.expose('public.realtime_get()');

-- Supabase only: signed-in sessions may receive broadcasts on our topics. Nobody may send from the client.
-- (The project's Realtime setting "Allow public access" must be off, docs/SETUP.md.)
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute $p$
      create policy tcge_receive on realtime.messages for select to authenticated
      using (
        realtime.messages.extension = 'broadcast'
        and (realtime.topic() = 'world' or realtime.topic() like 'player:%' or realtime.topic() like 'battle:%')
      )
    $p$;
  end if;
end $$;
