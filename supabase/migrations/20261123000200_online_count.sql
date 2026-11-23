-- 0.0.3: the menu shows how many players are online right now (seen within presence.online_seconds, you included),
-- so sync reports the count. Otherwise unchanged from 20261122000470_stammtisch.
create or replace function public.sync(p_after_notification bigint default 0, p_after_feed bigint default 0, p_after_chat bigint default 0)
returns jsonb
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
    ),
    'chat_unread', case when p_after_chat > 0 then (
      select count(*) from (
        select 1 from game.chat where id > p_after_chat and player_id is distinct from v_player limit 99
      ) x
    ) else 0 end,
    'chat_last_id', coalesce((select max(id) from game.chat), 0),
    'online', (
      select count(*) from game.players p
      where p.id = v_player or p.last_seen_at > v_now - make_interval(secs => private.cfg_num('presence.online_seconds'))
    )
  );
end $$;
