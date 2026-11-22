-- alpha_05 (Vier Spiele), part 3: hobby lore. Owning a card for the first time also counts towards the
-- collector achievement of its game (events collect_pokemon, collect_yugioh, collect_onepiece, collect_riftbound).

create or replace function private.on_collection_goals() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform private.emit(new.player_id, 'collect_' || (
    select s.game from game.card_defs c join game.set_defs s on s.id = c.set_id where c.id = new.card_id));
  perform private.goals_check(new.player_id, new.card_id);
  return new;
end $$;
