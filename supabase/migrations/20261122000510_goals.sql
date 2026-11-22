-- alpha_05 (Vier Spiele), part 2: Sammelziele (docs/GAME_DESIGN.md §6). A goal is a list of card groups; it is
-- reached when the player has ever owned a card of every group (game.collection). Reaching it once books a
-- permanent modifier (the bonus), a notification and a headline. Goals come from content/goals.ts.

create table game.goal_defs (
  key text primary key,
  set_id text not null references game.set_defs (id),
  groups jsonb not null,
  stat text not null,
  op text not null check (op in ('flat', 'pct')),
  value numeric not null
);
create index goal_defs_set on game.goal_defs (set_id);

create table game.goals_done (
  player_id uuid not null references game.players (id) on delete cascade,
  goal text not null references game.goal_defs (key) on delete cascade,
  at timestamptz not null,
  primary key (player_id, goal)
);
create index goals_done_goal on game.goals_done (goal);

alter table game.goal_defs enable row level security;
alter table game.goals_done enable row level security;

-- Groups of a goal the player has (any card of the group ever owned).
create function private.goal_have(p_player uuid, p_groups jsonb) returns int
language sql stable set search_path = '' as $$
  select count(*)::int from jsonb_array_elements(p_groups) g
  where exists (select 1 from game.collection c where c.player_id = p_player and g ? c.card_id)
$$;

-- Called for every card a player owns for the first time.
create function private.goals_check(p_player uuid, p_card text) returns void
language plpgsql set search_path = '' as $$
declare
  g game.goal_defs;
begin
  for g in
    select d.* from game.goal_defs d
    where exists (select 1 from jsonb_array_elements(d.groups) x where x ? p_card)
      and not exists (select 1 from game.goals_done where player_id = p_player and goal = d.key)
  loop
    if private.goal_have(p_player, g.groups) = jsonb_array_length(g.groups) then
      insert into game.goals_done (player_id, goal, at) values (p_player, g.key, private.now()) on conflict do nothing;
      insert into game.modifiers (player_id, source, stat, op, value)
      values (p_player, 'goal:' || g.key, g.stat, g.op, g.value) on conflict do nothing;
      perform private.notify(p_player, 'goal_done', jsonb_build_object('goal', g.key));
      perform private.feed_add('goal', jsonb_build_object('name', (select username from game.players where id = p_player), 'goal', g.key));
      perform private.emit(p_player, 'goal_done');
    end if;
  end loop;
end $$;

create function private.on_collection_goals() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform private.goals_check(new.player_id, new.card_id);
  return new;
end $$;
create trigger collection_goals after insert on game.collection
  for each row execute function private.on_collection_goals();

-- A reset starts the goals over (its modifiers and collection go with the reset itself).
create function private.on_player_reset_goals() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.goals_done where player_id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_goals after update of reset_at on game.players
  for each row execute function private.on_player_reset_goals();

create function public.goals_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object('goals', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'key', d.key,
      'set_id', d.set_id,
      'total', jsonb_array_length(d.groups),
      'have', private.goal_have(v_player, d.groups),
      'done_at', g.at,
      'stat', d.stat,
      'op', d.op,
      'value', d.value
    ) order by d.set_id, d.key), '[]'::jsonb)
    from game.goal_defs d
    left join game.goals_done g on g.goal = d.key and g.player_id = v_player
  ));
end $$;
select private.expose('public.goals_get()');
