-- alpha_08 (Freunde), part 5: Privatkredit and Ehre (docs/GAME_DESIGN.md §16.1–16.2). A lender offers a loan (amount,
-- interest, days) on a virtual Bierdeckel; the borrower accepts or declines. On the due date the server collects the
-- full amount if the borrower has it; otherwise the loan bursts: the borrower keeps the money, loses Ruf, gets a
-- Schufa entry (no new loans for a while) and a broken deal on the public Ehre record. Repaid loans are kept deals.
-- Net worth counts open loans (lender +, borrower −); the Wochenwertung ignores money moved between players.

alter table game.players
  add column honor_kept int not null default 0,
  add column honor_broken int not null default 0,
  add column schufa_until timestamptz;

create table game.loans (
  id bigint generated always as identity primary key,
  lender_id uuid not null references game.players (id) on delete cascade,
  borrower_id uuid not null references game.players (id) on delete cascade,
  principal_cents bigint not null check (principal_cents > 0),
  interest_pct int not null check (interest_pct between 0 and 100),
  days int not null check (days between 1 and 60),
  state text not null default 'offered' check (state in ('offered', 'active', 'repaid', 'defaulted', 'cancelled')),
  created_at timestamptz not null,
  due_at timestamptz,
  reminded boolean not null default false,
  closed_at timestamptz,
  check (lender_id <> borrower_id)
);
create index loans_lender on game.loans (lender_id, state);
create index loans_borrower on game.loans (borrower_id, state);
create index loans_due on game.loans (state, due_at);
alter table game.loans enable row level security;

-- A reset clears the record and every loan the player is part of.
create function private.on_player_reset_loans() returns trigger
language plpgsql set search_path = '' as $$
begin
  delete from game.loans where lender_id = new.id or borrower_id = new.id;
  update game.players set honor_kept = 0, honor_broken = 0, schufa_until = null where id = new.id;
  return null;
end $$;
create trigger players_reset_loans after update of reset_at on game.players
  for each row when (new.reset_at is distinct from old.reset_at) execute function private.on_player_reset_loans();

create function private.loan_due(l game.loans) returns bigint
language sql immutable set search_path = '' as $$
  select l.principal_cents + l.principal_cents * l.interest_pct / 100
$$;

create function private.honor_title(p_kept int, p_broken int) returns text
language sql stable set search_path = '' as $$
  select case
    when p_broken >= private.cfg_num('honor.judas_broken') then 'judas'
    when p_broken > 0 then 'schlitzohr'
    when p_kept >= private.cfg_num('honor.ehrenmann_kept') then 'ehrenmann'
    when p_kept >= private.cfg_num('honor.solide_kept') then 'solide'
  end
$$;

create function private.honor_doc(p game.players) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('kept', p.honor_kept, 'broken', p.honor_broken, 'title', private.honor_title(p.honor_kept, p.honor_broken),
    'schufa_until', case when p.schufa_until > private.now() then p.schufa_until end)
$$;

-- Money moved between players does not count for the Wochenwertung: the giver is not hurt, the receiver not helped.
create function private.league_shift(p_from uuid, p_to uuid, p_cents bigint) returns void
language sql set search_path = '' as $$
  update game.league set adjust_cents = adjust_cents + case when player_id = p_from then p_cents else -p_cents end
  where week = private.week_start() and player_id in (p_from, p_to)
$$;

-- Open loans: what the lender is owed counts for them, what the borrower owes counts against them (principal).
create or replace function private.net_worth(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select least(9000000000000000, (
      (select cash_cents from game.players where id = p_player)
    + coalesce(private.eur(private.bunker_content_base(p_player)), 0)
    + (select coalesce(sum(private.card_value(card_id) * qty), 0) from game.card_stacks where player_id = p_player)
    + (select coalesce(sum(private.slab_value(card_id, grader, grade, black_label)), 0) from game.card_copies where owner_id = p_player)
    + (select coalesce(sum(private.product_value(product_id) * qty), 0) from game.sealed where player_id = p_player)
    + (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.listings
       where seller_id = p_player and item_kind <> 'copy')
    + (select coalesce(sum(price_cents * qty), 0) from game.buy_orders where buyer_id = p_player)
    + (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.shipments
       where buyer_id = p_player and item_kind <> 'copy')
    + (select coalesce(sum(total_cents - fee_cents), 0) from game.shipments where seller_id = p_player)
    + (select coalesce(sum(private.card_or_product_value(item_id) * qty), 0) from game.ads
       where seller_id = p_player and item_kind <> 'copy')
    + (select coalesce(sum(paid_cents), 0) from game.homes where player_id = p_player) * private.cfg_num('housing.refund_bps') / 10000
    + (select coalesce(sum(paid_cents), 0) from game.furnishings where player_id = p_player) * private.cfg_num('housing.refund_bps') / 10000
    + (select coalesce(sum(principal_cents), 0) from game.loans where lender_id = p_player and state = 'active')
    - (select coalesce(sum(principal_cents), 0) from game.loans where borrower_id = p_player and state = 'active')
  )::numeric)::bigint
$$;

create function private.loan_doc(l game.loans, p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', l.id, 'state', l.state, 'principal_cents', l.principal_cents, 'interest_pct', l.interest_pct,
    'due_cents', private.loan_due(l), 'days', l.days, 'created_at', l.created_at, 'due_at', l.due_at, 'closed_at', l.closed_at,
    'role', case when l.lender_id = p_player then 'lender' else 'borrower' end,
    'other', (select jsonb_build_object('id', p.id, 'name', p.username, 'look', private.look(p), 'honor', private.honor_doc(p))
              from game.players p where p.id = case when l.lender_id = p_player then l.borrower_id else l.lender_id end)
  )
$$;

create function private.loans_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.loans')::int,
    'max_interest_pct', private.cfg_num('loan.max_interest_pct')::int,
    'max_days', private.cfg_num('loan.max_days')::int,
    'min_cents', private.eur(private.cfg_num('loan.min_base_cents')),
    'honor', (select private.honor_doc(p) from game.players p where p.id = p_player),
    'loans', coalesce((
      select jsonb_agg(private.loan_doc(l, p_player) order by l.state in ('offered', 'active') desc, coalesce(l.due_at, l.created_at))
      from (select * from game.loans l where (l.lender_id = p_player or l.borrower_id = p_player)
              and (l.state in ('offered', 'active') or l.closed_at > private.now() - interval '7 days')
            order by l.id desc limit 30) l
    ), '[]'::jsonb)
  )
$$;

-- Pays the loan back in full: kept deal.
create function private.loan_close_repaid(l game.loans) returns void
language plpgsql set search_path = '' as $$
declare
  v_due bigint := private.loan_due(l);
begin
  perform private.money_add(l.borrower_id, -v_due, 'loan_repay', l.id::text);
  perform private.money_add(l.lender_id, v_due, 'loan_repay', l.id::text);
  perform private.league_shift(l.borrower_id, l.lender_id, v_due - l.principal_cents);
  update game.loans set state = 'repaid', closed_at = private.now() where id = l.id;
  update game.players set honor_kept = honor_kept + 1 where id = l.borrower_id;
  perform private.notify(l.lender_id, 'loan_repaid', jsonb_build_object('name', (select username from game.players where id = l.borrower_id), 'cents', v_due));
  perform private.emit(l.borrower_id, 'loan_repaid');
end $$;

-- Due and not paid: the borrower keeps the money and the shame.
create function private.loan_default(l game.loans) returns void
language plpgsql set search_path = '' as $$
declare
  v_borrower text := (select username from game.players where id = l.borrower_id);
  v_lender text := (select username from game.players where id = l.lender_id);
begin
  update game.loans set state = 'defaulted', closed_at = private.now() where id = l.id;
  perform private.league_shift(l.lender_id, l.borrower_id, l.principal_cents);
  update game.players set honor_broken = honor_broken + 1, ruf = greatest(0, ruf - private.cfg_num('loan.default_ruf')::int),
    schufa_until = private.now() + make_interval(days => private.cfg_num('loan.schufa_days')::int)
  where id = l.borrower_id;
  perform private.notify(l.lender_id, 'loan_defaulted', jsonb_build_object('name', v_borrower, 'cents', private.loan_due(l)));
  perform private.notify(l.borrower_id, 'loan_defaulted_self', jsonb_build_object('name', v_lender, 'cents', private.loan_due(l)));
  perform private.feed_add('loan_defaulted', jsonb_build_object('name', v_borrower, 'other', v_lender, 'cents', l.principal_cents));
end $$;

create function private.tick_loans() returns void
language plpgsql set search_path = '' as $$
declare
  l game.loans;
begin
  for l in select * from game.loans where state = 'active' and not reminded
           and due_at <= private.now() + make_interval(hours => private.cfg_num('loan.remind_hours')::int) loop
    update game.loans set reminded = true where id = l.id;
    perform private.notify(l.borrower_id, 'loan_due', jsonb_build_object('name', (select username from game.players where id = l.lender_id),
      'cents', private.loan_due(l), 'due_at', l.due_at));
  end loop;
  for l in select * from game.loans where state = 'active' and due_at <= private.now() order by due_at loop
    begin
      perform 1 from game.players where id in (l.lender_id, l.borrower_id) order by id for update;
      if (select cash_cents from game.players where id = l.borrower_id) >= private.loan_due(l) then
        perform private.loan_close_repaid(l);
      else
        perform private.loan_default(l);
      end if;
    exception when others then
      insert into game.job_runs (name, started_at, ms, ok, error) values ('loans', private.now(), 0, false, sqlerrm);
    end;
  end loop;
end $$;
insert into game.tick_systems (name, every_seconds) values ('loans', 300);

-- ---------------------------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------------------------
create function public.loans_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return private.loans_doc(private.require_player());
end $$;
select private.expose('public.loans_get()');

create function public.loan_offer(p_request_id uuid, p_to uuid, p_cents bigint, p_interest_pct int, p_days int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'loan_offer');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'loans');
  perform private.rate_limit(v_player, 'trade', private.cfg_num('rate.trade')::int, 60);
  if p_to is null or p_to = v_player or not exists (select 1 from game.players where id = p_to)
     or p_cents is null or p_cents < private.eur(private.cfg_num('loan.min_base_cents'))
     or p_interest_pct is null or p_interest_pct not between 0 and private.cfg_num('loan.max_interest_pct')
     or p_days is null or p_days not between 1 and private.cfg_num('loan.max_days') then
    perform private.fail('invalid_request');
  end if;
  if (select level from game.players where id = p_to) < private.cfg_num('unlock.loans') then
    perform private.fail('partner_locked');
  end if;
  if (select schufa_until from game.players where id = p_to) > private.now() then
    perform private.fail('schufa');
  end if;
  if (select cash_cents from game.players where id = v_player) < p_cents then
    perform private.fail('not_enough_money');
  end if;
  insert into game.loans (lender_id, borrower_id, principal_cents, interest_pct, days, created_at)
  values (v_player, p_to, p_cents, p_interest_pct, p_days, private.now());
  perform private.notify(p_to, 'loan_offer', jsonb_build_object('name', (select username from game.players where id = v_player), 'cents', p_cents));
  return private.request_done(v_player, p_request_id, jsonb_build_object('loans', private.loans_doc(v_player)));
end $$;
select private.expose('public.loan_offer(uuid, uuid, bigint, int, int)');

-- The borrower takes the money (or turns the offer down).
create function public.loan_respond(p_request_id uuid, p_loan bigint, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'loan_respond');
  l game.loans;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into l from game.loans where id = p_loan and borrower_id = v_player for update;
  if not found or l.state <> 'offered' then
    perform private.fail('not_found');
  end if;
  if not coalesce(p_accept, false) then
    update game.loans set state = 'cancelled', closed_at = private.now() where id = l.id;
    perform private.notify(l.lender_id, 'loan_declined', jsonb_build_object('name', (select username from game.players where id = v_player)));
  else
    if (select schufa_until from game.players where id = v_player) > private.now() then
      perform private.fail('schufa');
    end if;
    perform 1 from game.players where id in (l.lender_id, l.borrower_id) order by id for update;
    if (select cash_cents from game.players where id = l.lender_id) < l.principal_cents then
      perform private.fail('lender_broke');
    end if;
    perform private.money_add(l.lender_id, -l.principal_cents, 'loan', l.id::text);
    perform private.money_add(v_player, l.principal_cents, 'loan', l.id::text);
    update game.loans set state = 'active', due_at = private.now() + make_interval(days => l.days) where id = l.id;
    perform private.notify(l.lender_id, 'loan_accepted', jsonb_build_object('name', (select username from game.players where id = v_player),
      'cents', l.principal_cents));
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object('loans', private.loans_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.loan_respond(uuid, bigint, boolean)');

-- The lender takes back an offer nobody has accepted yet.
create function public.loan_cancel(p_request_id uuid, p_loan bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'loan_cancel');
begin
  if v_replay is not null then
    return v_replay;
  end if;
  update game.loans set state = 'cancelled', closed_at = private.now() where id = p_loan and lender_id = v_player and state = 'offered';
  if not found then
    perform private.fail('not_found');
  end if;
  return private.request_done(v_player, p_request_id, jsonb_build_object('loans', private.loans_doc(v_player)));
end $$;
select private.expose('public.loan_cancel(uuid, bigint)');

create function public.loan_repay(p_request_id uuid, p_loan bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'loan_repay');
  l game.loans;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into l from game.loans where id = p_loan and borrower_id = v_player for update;
  if not found or l.state <> 'active' then
    perform private.fail('not_found');
  end if;
  perform 1 from game.players where id in (l.lender_id, l.borrower_id) order by id for update;
  perform private.loan_close_repaid(l);
  return private.request_done(v_player, p_request_id, jsonb_build_object('loans', private.loans_doc(v_player), 'player', private.me(v_player)));
end $$;
select private.expose('public.loan_repay(uuid, bigint)');

-- The profile shows the Ehre record.
create or replace function public.profile_get(p_player uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_me uuid := private.require_player();
  p game.players;
begin
  select * into p from game.players where id = coalesce(p_player, v_me);
  if not found then
    perform private.fail('not_found');
  end if;
  return jsonb_build_object(
    'id', p.id,
    'name', p.username,
    'title', p.title,
    'level', p.level,
    'net_worth_cents', private.net_worth(p.id),
    'created_at', p.created_at,
    'me', p.id = v_me,
    'look', private.look(p),
    'vitrine', private.vitrine_doc(p.id),
    'slots', private.vitrine_slots(p.id),
    'unlocked', p.level >= private.cfg_num('unlock.grading'),
    'stats', jsonb_build_object(
      'pack_opened', coalesce((select total from game.counters where player_id = p.id and event = 'pack_opened'), 0),
      'graded', coalesce((select total from game.counters where player_id = p.id and event = 'graded'), 0),
      'graded_10', coalesce((select total from game.counters where player_id = p.id and event = 'graded_10'), 0),
      'collection', private.collection_count(p.id)
    ),
    'trophies', private.trophies_doc(p.id),
    'home', jsonb_build_object(
      'tier', private.home_tier(p.id),
      'wohnwert', private.wohnwert(p.id),
      'furnishings', coalesce((select jsonb_object_agg(f.slot, f.item) from game.furnishings f where f.player_id = p.id), '{}'::jsonb)
    ),
    'guestbook', private.guestbook_doc(p.id),
    'signed_today', (select count(*) from game.guestbook where host_id = p.id and author_id = v_me
                     and (at at time zone 'Europe/Berlin')::date = private.today()) >= private.cfg_num('guestbook.per_day'),
    'honor', private.honor_doc(p)
  );
end $$;

-- The player list shows everyone's Ehre.
create or replace function public.players_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_now timestamptz := private.now();
begin
  return jsonb_build_object('players', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', p.username,
      'title', p.title,
      'level', p.level,
      'online', p.id = v_player or p.last_seen_at > v_now - make_interval(secs => private.cfg_num('presence.online_seconds')),
      'last_seen_at', p.last_seen_at,
      'me', p.id = v_player,
      'locked_until', private.trade_lock_until(p),
      'is_admin', p.is_admin,
      'look', private.look(p),
      'honor', private.honor_doc(p)
    ) order by p.last_seen_at desc), '[]'::jsonb)
    from game.players p
  ), 'trades', private.trades_doc(v_player),
  'friends', jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.friends')::int,
    'done', private.friend_acts_today(v_player),
    'help_minutes', private.cfg_num('help.max_minutes')::int,
    'kaffee_pct', private.cfg_num('kaffee.ep_pct')::int,
    'kaffee_minutes', private.cfg_num('kaffee.minutes')::int));
end $$;
