-- alpha_12 balance pass: EP rewards grow 3 % per level while the EP needed keeps growing 3,5 %, so the late game slows
-- down step by step (×1,27 at level 50, ×1,6 at level 100) and the first levels stay as fast as before. The quest list
-- now shows the EP a quest really gives at the current level instead of the stored level-1 units.

create or replace function private.ep_grant(p_player uuid, p_base_ep numeric) returns jsonb
language plpgsql set search_path = '' as $$
declare
  r game.players;
  v_median numeric;
  v_mult numeric;
  v_gain bigint;
  v_need bigint;
  v_levels int := 0;
  v_reward bigint;
  v_booster boolean;
  v_feature text;
begin
  select * into r from game.players where id = p_player for update;
  if not found then
    perform private.fail('no_player');
  end if;

  select percentile_cont(0.5) within group (order by level + 100 * prestige) into v_median
  from game.players
  where last_seen_at > private.now() - interval '72 hours';

  v_mult := private.stat(p_player, 'ep', 1);
  if v_median is not null and (r.level + 100 * r.prestige) + private.cfg_num('ep.catchup_levels') < v_median then
    v_mult := v_mult * (1 + private.cfg_num('ep.catchup_pct') / 100);
  end if;
  v_gain := round(p_base_ep * power(private.cfg_num('ep.reward_growth'), r.level) * v_mult)::bigint;
  update game.players set ep = ep + v_gain where id = p_player returning * into r;

  loop
    exit when r.level >= 100;
    v_need := private.ep_to_next(r.level);
    exit when r.ep < v_need;
    update game.players set ep = ep - v_need, level = level + 1, skill_points = skill_points + 1
    where id = p_player returning * into r;
    v_levels := v_levels + 1;

    v_reward := private.eur(private.level_reward_base(r.level));
    perform private.money_add(p_player, v_reward, 'level_reward', r.level::text);
    v_booster := r.level % private.cfg_num('level.booster_every')::int = 0;
    if v_booster then
      perform private.sealed_add(p_player, private.cfg('level.reward_product') #>> '{}', 1);
    end if;
    perform private.notify(p_player, 'level_up',
      jsonb_build_object('level', r.level, 'reward_cents', v_reward, 'booster', v_booster));
    -- features that open at this level
    for v_feature in
      select substr(key, 8) from game.config where key like 'unlock.%' and (value #>> '{}')::int = r.level
    loop
      perform private.notify(p_player, 'unlock', jsonb_build_object('feature', v_feature));
    end loop;
    perform private.bunker_ensure(p_player);
    perform private.emit(p_player, 'level_up');
    select * into r from game.players where id = p_player;
  end loop;

  return jsonb_build_object('ep_gained', v_gain, 'levels_gained', v_levels, 'level', r.level, 'ep', r.ep);
end $$;

create or replace function private.quest_list(p_player uuid, p_kind text, p_period date) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'template', template, 'target', target, 'progress', progress,
    'reward_cents', reward_cents, 'reward_pfandbons', reward_pfandbons,
    -- the EP the player really gets at the current level (stored in level-1 units)
    'reward_ep', round(reward_ep * power(private.cfg_num('ep.reward_growth'), (select level from game.players where id = p_player))
                       * private.stat(p_player, 'ep', 1)),
    'claimed', claimed_at is not null
  ) order by id), '[]'::jsonb)
  from game.quests
  where player_id = p_player and kind = p_kind
    and case when p_kind = 'mini' then claimed_at is null else period = p_period end
$$;
