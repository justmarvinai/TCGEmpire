-- The tutorial is guided and cannot be skipped (owner request, decision 114). Its steps still complete through
-- private.emit when the player does the real action; no step is acknowledged by a click any more.
drop function public.tutorial_skip(uuid);
drop function public.tutorial_ack(uuid);

-- The last step asks for a quest reward, but the first mini-quests are random: after the tutorial's actions there
-- was often none ready, and the guide pointed at a reward that did not exist. Reaching that step now completes the
-- oldest open mini-quest if none is ready (otherwise unchanged from 20261122000200_progress).
create or replace function private.tutorial_check(p_player uuid, p_event text) returns void
language plpgsql set search_path = '' as $$
declare
  v_step int;
  s game.tutorial_steps;
begin
  select tutorial_step into v_step from game.players where id = p_player;
  if v_step is null or v_step < 0 then
    return;
  end if;
  select * into s from game.tutorial_steps where step = v_step;
  if not found or s.event <> p_event then
    return;
  end if;
  update game.players
  set tutorial_step = case when exists (select 1 from game.tutorial_steps where step = v_step + 1) then v_step + 1 else -1 end
  where id = p_player;
  if (select event from game.tutorial_steps where step = v_step + 1) = 'quest_claimed'
     and not exists (select 1 from game.quests
                     where player_id = p_player and kind = 'mini' and claimed_at is null and progress >= target) then
    update game.quests set progress = target
    where id = (select id from game.quests
                where player_id = p_player and kind = 'mini' and claimed_at is null order by id limit 1);
  end if;
  if s.reward_booster > 0 then
    perform private.sealed_add(p_player, private.cfg('level.reward_product') #>> '{}', s.reward_booster);
  end if;
  if s.reward_base_cents > 0 then
    perform private.money_add(p_player, private.eur(s.reward_base_cents), 'tutorial');
  end if;
  if s.reward_ep > 0 then
    perform private.ep_grant(p_player, s.reward_ep);
  end if;
end $$;
