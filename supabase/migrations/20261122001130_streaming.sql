-- alpha_11 (Mogul), part 4: Streaming (docs/GAME_DESIGN.md §17), level 45. A player goes live; while live, the event
-- counters that pack opening already feeds (packs, hits, Ultras, Grails) move the stream: packs bring viewers and
-- slowly bore them, hits bring donations (minutes of reference income per 100 viewers, capped per day) and Followers.
-- After 30 minutes without a pack the audience has left and the stream starts small again. A sponsor pays for a
-- number of boosters opened live within a day. Half of the Followers survive an exit.

create table game.streams (
  player_id uuid primary key references game.players (id) on delete cascade,
  live boolean not null default false,
  viewers numeric not null default 0,
  followers bigint not null default 0,
  last_at timestamptz,
  day date,
  day_cents bigint not null default 0,
  total_cents bigint not null default 0,
  sponsor text,
  sponsor_packs int not null default 0,
  sponsor_until timestamptz
);
alter table game.streams enable row level security;

create function private.stream_base(s game.streams) returns numeric
language sql stable set search_path = '' as $$
  select private.cfg_num('stream.start_viewers') + s.followers * private.cfg_num('stream.follower_viewers_pct') / 100
$$;

create function private.stream_cap(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select round(private.eur(private.ref_income_base((select level from game.players where id = p_player))
    * private.cfg_num('stream.daily_cap_minutes') / 60))::bigint
$$;

create function private.stream_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.streaming')::int,
    'live', coalesce(s.live, false),
    'viewers', coalesce(floor(s.viewers), 0)::int,
    'followers', coalesce(s.followers, 0),
    'today_cents', case when s.day = private.today() then s.day_cents else 0 end,
    'cap_cents', private.stream_cap(p_player),
    'total_cents', coalesce(s.total_cents, 0),
    'sponsor', case when s.sponsor is not null and s.sponsor_until > private.now() then jsonb_build_object(
      'key', s.sponsor, 'done', s.sponsor_packs, 'need', (private.cfg('stream.sponsors') -> s.sponsor ->> 'packs')::int,
      'reward_cents', round(private.eur(private.ref_income_base((select level from game.players where id = p_player))
        * (private.cfg('stream.sponsors') -> s.sponsor ->> 'rewardMinutes')::numeric / 60))::bigint,
      'until', s.sponsor_until) end
  )
  from (select p_player as id) x left join game.streams s on s.player_id = x.id
$$;

create function public.stream_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return private.stream_doc(v_player);
end $$;
select private.expose('public.stream_get()');

-- Live on or off. Going live brings the base audience and, if there is none, a sponsor offer for the day.
create function public.stream_set(p_request_id uuid, p_live boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'stream_set');
  s game.streams;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'streaming');
  if p_live is null then
    perform private.fail('invalid_request');
  end if;
  insert into game.streams (player_id) values (v_player) on conflict do nothing;
  select * into s from game.streams where player_id = v_player for update;
  if p_live then
    update game.streams set live = true, viewers = private.stream_base(s), last_at = private.now(),
      -- one sponsor window a day: a deal that is done or running keeps its window
      sponsor = case when s.sponsor_until > private.now() then s.sponsor
                     else (select key from jsonb_each(private.cfg('stream.sponsors')) order by private.rand() limit 1) end,
      sponsor_packs = case when s.sponsor_until > private.now() then s.sponsor_packs else 0 end,
      sponsor_until = case when s.sponsor_until > private.now() then s.sponsor_until
                           else private.now() + make_interval(hours => private.cfg_num('stream.sponsor_hours')::int) end
    where player_id = v_player;
    perform private.emit(v_player, 'stream_started');
  else
    update game.streams set live = false, viewers = 0 where player_id = v_player;
  end if;
  return private.request_done(v_player, p_request_id, private.stream_doc(v_player));
end $$;
select private.expose('public.stream_set(uuid, boolean)');

-- The show: reacts to the counters of a live player.
create function private.on_stream_counter() returns trigger
language plpgsql set search_path = '' as $$
declare
  s game.streams;
  v_n numeric := new.total - case when tg_op = 'UPDATE' then old.total else 0 end;
  v_kind text := case new.event when 'pack_opened' then 'pack' when 'hit_pulled' then 'hit' when 'pulled_ultra' then 'ultra'
                                when 'pulled_grail' then 'grail' end;
  v_cents bigint;
  v_reward bigint;
  v_level int;
begin
  select * into s from game.streams where player_id = new.player_id and live for update;
  if not found or v_n <= 0 then
    return null;
  end if;
  if s.last_at < private.now() - make_interval(mins => private.cfg_num('stream.idle_minutes')::int) then
    s.viewers := private.stream_base(s);   -- everybody left in the meantime
  end if;
  if s.day is distinct from private.today() then
    s.day := private.today();
    s.day_cents := 0;
  end if;
  v_level := (select level from game.players where id = new.player_id);
  if v_kind = 'pack' then
    s.viewers := s.viewers * power(private.cfg_num('stream.decay_per_pack'), v_n) + private.cfg_num('stream.viewers_per_pack') * v_n;
    if s.sponsor is not null and s.sponsor_until > private.now() then
      s.sponsor_packs := s.sponsor_packs + v_n::int;
      if s.sponsor_packs >= (private.cfg('stream.sponsors') -> s.sponsor ->> 'packs')::int then
        v_reward := round(private.eur(private.ref_income_base(v_level) * (private.cfg('stream.sponsors') -> s.sponsor ->> 'rewardMinutes')::numeric / 60));
        perform private.money_add(new.player_id, v_reward, 'stream_sponsor', s.sponsor);
        perform private.notify(new.player_id, 'stream_sponsor', jsonb_build_object('key', s.sponsor, 'cents', v_reward));
        s.sponsor := null;   -- the window stays: the next sponsor comes after it
        s.sponsor_packs := 0;
      end if;
    end if;
  else
    v_cents := least(greatest(0, private.stream_cap(new.player_id) - s.day_cents),
      round(private.eur(private.ref_income_base(v_level) * (private.cfg('stream.donation_minutes') ->> v_kind)::numeric / 60
        * v_n * s.viewers / 100)))::bigint;
    if v_cents > 0 then
      perform private.money_add(new.player_id, v_cents, 'stream_donation', v_kind);
      s.day_cents := s.day_cents + v_cents;
      s.total_cents := s.total_cents + v_cents;
    end if;
    s.followers := s.followers + round(s.viewers * (private.cfg('stream.follow_share') ->> v_kind)::numeric * v_n)::bigint;
    s.viewers := s.viewers + (private.cfg('stream.viewer_boost') ->> v_kind)::numeric * v_n;
  end if;
  update game.streams set viewers = s.viewers, followers = s.followers, last_at = private.now(), day = s.day,
    day_cents = s.day_cents, total_cents = s.total_cents, sponsor = s.sponsor, sponsor_packs = s.sponsor_packs,
    sponsor_until = s.sponsor_until
  where player_id = new.player_id;
  return null;
end $$;
create trigger counters_stream after insert or update on game.counters
  for each row when (new.event in ('pack_opened', 'hit_pulled', 'pulled_ultra', 'pulled_grail'))
  execute function private.on_stream_counter();

-- An exit keeps half of the Followers; an account reset none.
create function private.on_prestige_stream() returns trigger
language plpgsql set search_path = '' as $$
begin
  update game.streams set live = false, viewers = 0,
    followers = floor(followers * private.cfg_num('stream.exit_followers_pct') / 100)
  where player_id = new.player_id;
  return null;
end $$;
create trigger prestiges_stream after insert on game.prestiges
  for each row execute function private.on_prestige_stream();

create function private.on_player_reset_stream() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.streams where player_id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_stream after update of reset_at on game.players
  for each row execute function private.on_player_reset_stream();
