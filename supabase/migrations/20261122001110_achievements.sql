-- alpha_11 (Mogul), part 2: achievements for every system (content/achievements.ts, about 200 tiers). The new counters
-- come from logs that exist already: the attack log and the Adventskalender doors.
create function private.on_attack_counted() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kind = 'kredit' then
    perform private.emit(new.attacker_id, 'loan_burst');
  elsif new.success then
    perform private.emit(new.attacker_id, 'attack_success');
  elsif new.victim_id is not null then
    perform private.emit(new.victim_id, 'attack_defended');
  end if;
  return null;
end $$;
create trigger attacks_counted after insert on game.attacks
  for each row execute function private.on_attack_counted();

create function private.on_advent_counted() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.player_id is not null and new.key like 'advent\_%' then
    perform private.emit(new.player_id, 'advent_opened');
  end if;
  return null;
end $$;
create trigger events_advent_counted after insert on game.events
  for each row execute function private.on_advent_counted();
