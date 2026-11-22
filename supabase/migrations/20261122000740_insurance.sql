-- alpha_07 (Leben), part 5: Versicherungen (docs/GAME_DESIGN.md §19, docs/ECONOMY.md §10.2). A policy costs a
-- premium every German day (no money: the policy ends). Two risks exist so far:
--   Versand: a parcel to a player gets lost now and then (seller is paid, the buyer loses the goods); insured buyers
--            get the price back.
--   Hausrat: once a day a player with a home of their own can suffer a Wasserschaden that ruins part of the bulk
--            cards; insured players get their value back.
-- Rechtsschutz and Betriebshaftpflicht follow with the risks they cover (Finanzamt, company).

create table game.insurance (
  player_id uuid not null references game.players (id) on delete cascade,
  kind text not null check (kind in ('versand', 'hausrat')),
  since timestamptz not null,
  paid_day date not null,
  primary key (player_id, kind)
);
alter table game.insurance enable row level security;

alter table game.homes add column disaster_day date;

create function private.insured(p_player uuid, p_kind text) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from game.insurance where player_id = p_player and kind = p_kind)
$$;

-- Value of the bulk cards (what Hausrat insures).
create function private.bulk_value(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select coalesce(sum(private.card_value(card_id) * qty), 0)::bigint from game.card_stacks where player_id = p_player
$$;

-- Today's premium of a policy.
create function private.premium(p_player uuid, p_kind text) returns bigint
language sql stable set search_path = '' as $$
  select case p_kind
    when 'versand' then private.eur((private.cfg('insurance.policies') -> 'versand' ->> 'premium_base_cents')::numeric)
    else greatest(private.eur((private.cfg('insurance.policies') -> 'hausrat' ->> 'min_base_cents')::numeric),
                  round(private.bulk_value(p_player) * (private.cfg('insurance.policies') -> 'hausrat' ->> 'premium_bps')::numeric / 10000)::bigint)
  end
$$;

create function private.insurance_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.insurance')::int,
    'has_home', private.home_tier(p_player) > 0,
    'lost_parcel_bps', private.cfg_num('insurance.lost_parcel_bps')::int,
    'water_damage_pct', private.cfg_num('insurance.water_damage_pct')::int,
    'bulk_cents', private.bulk_value(p_player),
    'policies', (
      select jsonb_agg(jsonb_build_object(
        'kind', k.kind,
        'active', i.player_id is not null,
        'since', i.since,
        'premium_cents', private.premium(p_player, k.kind)
      ) order by k.ord)
      from (values ('versand', 1), ('hausrat', 2)) k (kind, ord)
      left join game.insurance i on i.player_id = p_player and i.kind = k.kind
    )
  )
$$;

create function public.insurance_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return private.insurance_doc(v_player);
end $$;
select private.expose('public.insurance_get()');

-- Take out a policy (the first day is paid at once) or cancel it.
create function public.insurance_set(p_request_id uuid, p_kind text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'insurance_set');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'insurance');
  if p_kind is null or p_kind not in ('versand', 'hausrat') or p_on is null then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  if p_on then
    if private.insured(v_player, p_kind) then
      perform private.fail('already_owned');
    end if;
    if p_kind = 'hausrat' and private.home_tier(v_player) = 0 then
      perform private.fail('locked');
    end if;
    perform private.money_add(v_player, -private.premium(v_player, p_kind), 'insurance', p_kind);
    insert into game.insurance (player_id, kind, since, paid_day) values (v_player, p_kind, private.now(), private.today());
  else
    delete from game.insurance where player_id = v_player and kind = p_kind;
    if not found then
      perform private.fail('not_found');
    end if;
  end if;
  return private.request_done(v_player, p_request_id, private.insurance_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;
select private.expose('public.insurance_set(uuid, text, boolean)');

-- Daily: premiums (a policy without money ends), then the Wasserschaden roll for players with a home.
create function private.tick_insurance() returns void
language plpgsql set search_path = '' as $$
declare
  r record;
  v_cost bigint;
  v_lost bigint;
  v_cards int;
begin
  for r in select * from game.insurance where paid_day < private.today() loop
    begin
      v_cost := private.premium(r.player_id, r.kind);
      if (select cash_cents from game.players where id = r.player_id) >= v_cost then
        perform private.money_add(r.player_id, -v_cost, 'insurance', r.kind);
        update game.insurance set paid_day = private.today() where player_id = r.player_id and kind = r.kind;
      else
        delete from game.insurance where player_id = r.player_id and kind = r.kind;
        perform private.notify(r.player_id, 'insurance_ended', jsonb_build_object('kind', r.kind));
      end if;
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('insurance', private.now(), 0, false, sqlerrm);
    end;
  end loop;

  for r in select h.player_id from game.homes h where h.tier > 0 and (h.disaster_day is null or h.disaster_day < private.today()) loop
    begin
      update game.homes set disaster_day = private.today() where player_id = r.player_id;
      if private.rand() * 100 < private.cfg_num('insurance.water_damage_pct') then
        with hit as (
          select card_id, floor(qty * private.cfg_num('insurance.water_damage_share_pct') / 100)::int as n
          from game.card_stacks where player_id = r.player_id
        ), gone as (
          update game.card_stacks s set qty = s.qty - h.n
          from hit h where s.player_id = r.player_id and s.card_id = h.card_id and h.n > 0
          returning s.card_id, h.n
        )
        select coalesce(sum(private.card_value(card_id) * n), 0)::bigint, coalesce(sum(n), 0)::int into v_lost, v_cards from gone;
        delete from game.card_stacks where player_id = r.player_id and qty = 0;
        if v_cards > 0 then
          if private.insured(r.player_id, 'hausrat') then
            perform private.money_add(r.player_id, v_lost, 'insurance_claim', 'hausrat');
          end if;
          perform private.notify(r.player_id, 'water_damage', jsonb_build_object(
            'cards', v_cards, 'cents', v_lost, 'insured', private.insured(r.player_id, 'hausrat')));
        end if;
      end if;
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('insurance', private.now(), 0, false, sqlerrm);
    end;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('insurance', 600);

-- Parcels: now and then one to a player gets lost (from the insurance unlock level on). The seller is paid anyway;
-- an insured buyer gets the price back.
create or replace function private.shipment_deliver(p_id bigint) returns void
language plpgsql set search_path = '' as $$
declare
  s game.shipments;
  v_lost boolean := false;
begin
  delete from game.shipments where id = p_id returning * into s;
  if not found then
    return;
  end if;
  if s.buyer_id is not null then
    v_lost := (select level from game.players where id = s.buyer_id) >= private.cfg_num('unlock.insurance')
              and private.rand() * 10000 < private.cfg_num('insurance.lost_parcel_bps');
    if v_lost then
      if s.item_kind = 'copy' then
        delete from game.card_copies where id = s.copy_id;
      end if;
      if private.insured(s.buyer_id, 'versand') then
        perform private.money_add(s.buyer_id, s.total_cents, 'insurance_claim', 'versand');
      end if;
      perform private.notify(s.buyer_id, 'parcel_lost', jsonb_build_object('item_id', s.item_id, 'qty', s.qty,
        'cents', s.total_cents, 'insured', private.insured(s.buyer_id, 'versand')));
    else
      if s.item_kind = 'copy' then
        perform private.item_give(s.buyer_id, 'copy', s.item_id, s.copy_id, 1);
      else
        perform private.item_give(s.buyer_id, s.item_kind, s.item_id, null, s.qty);
      end if;
      perform private.notify(s.buyer_id, 'parcel_arrived', jsonb_build_object('item_id', s.item_id, 'qty', s.qty));
    end if;
  elsif s.npc_buyer is not null then
    insert into game.npc_stock (npc_id, item_id, qty) values (s.npc_buyer, s.item_id, s.qty)
    on conflict (npc_id, item_id) do update set qty = game.npc_stock.qty + excluded.qty;
  end if;
  if s.seller_id is not null then
    perform private.money_add(s.seller_id, s.total_cents - s.fee_cents, 'market_sale', s.item_id);
    perform private.ep_grant(s.seller_id, private.cfg_num('ep.sale'));
    if s.item_kind <> 'sealed' then
      perform private.emit(s.seller_id, 'cards_sold', s.qty);
    end if;
    perform private.notify(s.seller_id, 'sale_paid',
      jsonb_build_object('item_id', s.item_id, 'qty', s.qty, 'cents', s.total_cents - s.fee_cents));
  elsif s.npc_seller is not null then
    update game.npcs set budget_cents = budget_cents + s.total_cents - s.fee_cents where id = s.npc_seller;
  end if;
end $$;

-- A reset ends every policy.
create function private.on_player_reset_insurance() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.reset_at is distinct from old.reset_at then
    delete from game.insurance where player_id = new.id;
  end if;
  return new;
end $$;
create trigger players_reset_insurance after update of reset_at on game.players
  for each row execute function private.on_player_reset_insurance();
