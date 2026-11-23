-- alpha_12 balance pass: a quest is only offered when the player can still do it. New-card quests need a card the
-- player has never had in a set of a licensed game that is still sold; upgrade quests need an upgrade below its
-- maximum. Without this, a finished set or maxed upgrades made dailies impossible and cost the "all five" bonus.

create function private.quest_doable(p_player uuid, p_event text) returns boolean
language sql stable set search_path = '' as $$
  select case p_event
    when 'card_new' then exists (
      select 1 from game.card_defs c
      join game.set_defs s on s.id = c.set_id and s.phase in ('print', 'last_wave')
      join game.licenses l on l.player_id = p_player and l.game = s.game
      where not exists (select 1 from game.collection x where x.player_id = p_player and x.card_id = c.id))
    when 'upgrade_bought' then exists (
      select 1 from game.upgrade_defs d where private.upgrade_level(p_player, d.key) < d.max_level)
    else true
  end
$$;

create or replace function private.quests_fill_kind(p_player uuid, p_kind text, p_period date, p_slots int, p_level int,
  p_exclude text default null) returns void
language plpgsql set search_path = '' as $$
declare
  v_have int;
  t game.quest_templates;
begin
  select count(*) into v_have from game.quests
  where player_id = p_player and kind = p_kind
    and case when p_kind = 'mini' then claimed_at is null else period = p_period end;
  for t in
    select * from game.quest_templates
    where kind = p_kind and min_level <= p_level and key is distinct from p_exclude
      and key not in (
        select template from game.quests where player_id = p_player and kind = p_kind
          and case when p_kind = 'mini' then claimed_at is null else period = p_period end
      )
      and private.quest_doable(p_player, event)
    order by private.rand()
    limit greatest(0, p_slots - v_have)
  loop
    insert into game.quests (player_id, template, event, target, reward_cents, reward_ep, reward_pfandbons, created_at, kind, period)
    values (
      p_player, t.key, t.event,
      t.min_target + floor(private.rand() * (t.max_target - t.min_target + 1))::int,
      private.eur(private.ref_income_base(p_level) * private.cfg_num('quest.' || p_kind || '_reward_minutes') / 60),
      round(private.ep_share(p_level, private.cfg_num('quest.' || p_kind || '_ep_share')))::int,
      private.cfg_num('quest.' || p_kind || '_pfandbons')::int,
      private.now(), p_kind, p_period
    );
  end loop;
end $$;
