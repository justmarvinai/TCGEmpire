-- 0.0.6: only weekly quests pay money (content/config.ts: the mini, daily and daily-bonus minutes are 0). The daily
-- bonus still pays EP, so the quest document now names it for the "Alle fünf" line.
create or replace function private.quests_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'mini', private.quest_list(p_player, 'mini', null),
    'daily', private.quest_list(p_player, 'daily', private.today()),
    'weekly', private.quest_list(p_player, 'weekly', private.week_start()),
    'claimed_total', p.quests_claimed,
    'bonus_every', private.cfg_num('quest.bonus_every'),
    'reroll_free', p.reroll_day is distinct from private.today(),
    'daily_bonus_cents', private.eur(private.ref_income_base(p.level) * private.cfg_num('quest.daily_bonus_minutes') / 60),
    'daily_bonus_ep', round(private.ep_share(p.level, private.cfg_num('quest.daily_bonus_ep_share')))::bigint,
    'daily_bonus_done', coalesce(p.daily_bonus_day = private.today(), false),
    'weekly_chest_boosters', private.cfg_num('quest.weekly_chest_boosters'),
    'weekly_bonus_done', coalesce(p.weekly_bonus_week = private.week_start(), false),
    'unlock_daily', private.cfg_num('unlock.daily_quests'),
    'unlock_weekly', private.cfg_num('unlock.weekly_quests'),
    'stamps', private.stamps_doc(p_player)
  )
  from game.players p where p.id = p_player
$$;
