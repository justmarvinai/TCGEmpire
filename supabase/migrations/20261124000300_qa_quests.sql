-- QA pass (24 Nov 2026): "Zieh {n} Energiekarten" is only offered to players who can pull energy cards (only Pokémon
-- boosters have them; Yu-Gi-Oh!, One Piece and Riftbound starters could never finish it, and a mini quest cannot be
-- rerolled). Quests that are stuck already are swapped for new ones.
create or replace function private.quest_doable(p_player uuid, p_event text) returns boolean
language sql stable set search_path = '' as $$
  select case p_event
    when 'card_new' then exists (
      select 1 from game.card_defs c
      join game.set_defs s on s.id = c.set_id and s.phase in ('print', 'last_wave')
      where (s.house or exists (select 1 from game.licenses l where l.player_id = p_player and l.game = s.game))
        and not exists (select 1 from game.collection x where x.player_id = p_player and x.card_id = c.id))
    when 'energy_pulled' then exists (
      select 1 from game.card_defs c
      join game.set_defs s on s.id = c.set_id and s.phase in ('print', 'last_wave')
      where c.kind = 'energy'
        and (s.house or exists (select 1 from game.licenses l where l.player_id = p_player and l.game = s.game)))
    when 'upgrade_bought' then exists (
      select 1 from game.upgrade_defs d where private.upgrade_level(p_player, d.key) < d.max_level)
    else true
  end
$$;

do $$
declare
  r record;
begin
  for r in select distinct player_id from game.quests
           where event = 'energy_pulled' and claimed_at is null and not private.quest_doable(player_id, 'energy_pulled') loop
    delete from game.quests where player_id = r.player_id and event = 'energy_pulled' and claimed_at is null;
    perform private.quests_fill(r.player_id);
  end loop;
end $$;
