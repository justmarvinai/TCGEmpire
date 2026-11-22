-- alpha_04 (Flip), part 8: Stammtisch chat (docs/GAME_DESIGN.md §16.4) with optional card or product links,
-- an unread count in sync, and market headlines for KARTEN-BILD: big Cardmarket deals and the day's biggest
-- price moves. Presence comes from last_seen_at (players_get). Realtime arrives with the deployed project;
-- until then sync (15 s) and the open chat page (5 s) poll.

create table game.chat (
  id bigint generated always as identity primary key,
  player_id uuid references game.players (id) on delete set null,
  body text not null check (char_length(body) <= 280),
  item_id text,
  at timestamptz not null
);
create index chat_player on game.chat (player_id);
alter table game.chat enable row level security;

-- The latest messages (oldest first); deleted accounts show without a name.
create function private.chat_doc(p_player uuid) returns jsonb
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
        'at', c.at
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

create function public.chat_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return private.chat_doc(v_player);
end $$;
select private.expose('public.chat_get()');

create function public.chat_send(p_request_id uuid, p_body text, p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'chat_send');
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.rate_limit(v_player, 'chat', private.cfg_num('rate.chat')::int, 60);
  if char_length(v_body) > 280 or (v_body = '' and p_item is null)
     or (p_item is not null and not exists (select 1 from game.card_defs where id = p_item)
         and not exists (select 1 from game.product_defs where id = p_item)) then
    perform private.fail('invalid_request');
  end if;
  insert into game.chat (player_id, body, item_id, at) values (v_player, v_body, p_item, private.now());
  delete from game.chat where id <= (select max(id) from game.chat) - private.cfg_num('chat.keep');
  perform private.emit(v_player, 'chat_sent');
  return private.request_done(v_player, p_request_id, private.chat_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.chat_send(uuid, text, text)');

-- sync (replaces the alpha_01 version): also the number of new chat messages by others since p_after_chat
-- (0 = this device has not opened the chat yet: no count) and the newest chat id.
drop function public.sync(bigint, bigint);
create function public.sync(p_after_notification bigint default 0, p_after_feed bigint default 0, p_after_chat bigint default 0)
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
    'chat_last_id', coalesce((select max(id) from game.chat), 0)
  );
end $$;
select private.expose('public.sync(bigint, bigint, bigint)');

-- ---------------------------------------------------------------------------------------------
-- KARTEN-BILD market headlines
-- ---------------------------------------------------------------------------------------------

-- A big Cardmarket deal with a player on one side makes the news when it ships.
create function private.on_shipment_feed() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.buyer_id is not null or new.seller_id is not null)
     and new.total_cents >= private.eur(private.cfg_num('feed.big_deal_base_cents')) then
    perform private.feed_add('big_deal', jsonb_build_object(
      'buyer', coalesce((select username from game.players where id = new.buyer_id), (select name from game.npcs where id = new.npc_buyer)),
      'seller', coalesce((select username from game.players where id = new.seller_id), (select name from game.npcs where id = new.npc_seller)),
      'item_id', new.item_id, 'qty', new.qty, 'cents', new.total_cents));
  end if;
  return new;
end $$;
create trigger shipments_feed after insert on game.shipments
  for each row execute function private.on_shipment_feed();

-- Once a day per direction: the biggest riser and faller since the day opened, if they moved enough.
create function private.tick_headlines() returns void
language plpgsql set search_path = '' as $$
declare
  v_today date := private.today();
  v_since timestamptz := v_today::timestamp at time zone 'Europe/Berlin';
  v_min bigint := private.eur(private.cfg_num('feed.price_move_min_base_cents'));
  r record;
begin
  for r in
    (select 'up' as dir, item_id, round(100.0 * value_cents / day_open_cents - 100)::int as pct
     from game.prices where day = v_today and day_open_cents >= v_min
     order by value_cents::numeric / day_open_cents desc limit 1)
    union all
    (select 'down', item_id, round(100.0 * value_cents / day_open_cents - 100)::int
     from game.prices where day = v_today and day_open_cents >= v_min
     order by value_cents::numeric / day_open_cents limit 1)
  loop
    if abs(r.pct) >= private.cfg_num('feed.price_move_pct') and (r.dir = 'up') = (r.pct > 0)
       and not exists (select 1 from game.feed where kind = 'price_move' and at >= v_since and data ->> 'dir' = r.dir) then
      perform private.feed_add('price_move', jsonb_build_object('dir', r.dir, 'item_id', r.item_id, 'pct', r.pct));
    end if;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('headlines', 3600);
