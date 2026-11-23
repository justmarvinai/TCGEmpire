-- alpha_11 (Mogul), part 5: Höhle der Löwen (docs/GAME_DESIGN.md §9, level 60). Once a German week a company owner
-- pitches; three Löwen offer cash into the company account for a share of the company. Shares add up (at most 49 %);
-- they lower the company's value in net worth and the Löwen take their share of every payout. No buyback.

alter table game.companies add column investor_pct int not null default 0 check (investor_pct between 0 and 100);

create table game.loewen_pitches (
  company_id bigint not null references game.companies (id) on delete cascade,
  week date not null,
  offers jsonb not null,
  chosen int,
  primary key (company_id, week)
);
alter table game.loewen_pitches enable row level security;

-- The investors' share shows in the value and in payouts.
create or replace function private.company_value(p_player uuid) returns bigint
language sql stable set search_path = '' as $$
  select coalesce((
    select ((c.cash_cents + c.invested_cents * private.cfg_num('company.invest_bps') / 10000
      + greatest(0, (select coalesce(sum(revenue_cents - costs_cents), 0) from game.company_days
                     where company_id = c.id and day > private.today() - 7) / 7 * private.cfg_num('company.value_profit_days')))
            * (100 - c.investor_pct) / 100)::bigint
    from game.companies c where c.owner_id = p_player and c.closed_at is null
  ), 0)
$$;

create or replace function public.company_money(p_request_id uuid, p_cents bigint, p_payout boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'company_money');
  c game.companies;
  v_net bigint;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  if p_cents is null or p_cents < 1 then
    perform private.fail('invalid_request');
  end if;
  perform 1 from game.players where id = v_player for update;
  select * into c from game.companies where owner_id = v_player and closed_at is null for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if coalesce(p_payout, false) then
    perform private.company_spend(c.id, p_cents);
    -- the Löwen take their share first, then the Finanzamt
    v_net := p_cents - p_cents * c.investor_pct / 100;
    v_net := v_net - v_net * private.cfg_num('company.payout_tax_pct')::bigint / 100;
    perform private.money_add(v_player, v_net, 'company_payout', c.id::text);
  else
    perform private.money_add(v_player, -p_cents, 'company_deposit', c.id::text);
    update game.companies set cash_cents = cash_cents + p_cents where id = c.id;
  end if;
  return private.request_done(v_player, p_request_id, private.company_doc(v_player) || jsonb_build_object('player', private.me(v_player)));
end $$;

create function private.loewen_doc(p_player uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'unlock_level', private.cfg_num('unlock.loewen')::int,
    'investor_pct', c.investor_pct,
    'max_pct', private.cfg_num('loewen.max_share_pct')::int,
    'pitch', (select jsonb_build_object('offers', l.offers, 'chosen', l.chosen) from game.loewen_pitches l
              where l.company_id = c.id and l.week = private.week_start()),
    'value_cents', private.company_value(p_player))
  from game.companies c where c.owner_id = p_player and c.closed_at is null
$$;

create function public.loewen_get() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return coalesce(private.loewen_doc(v_player), jsonb_build_object('unlock_level', private.cfg_num('unlock.loewen')::int,
    'investor_pct', 0, 'max_pct', private.cfg_num('loewen.max_share_pct')::int, 'pitch', null, 'value_cents', 0));
end $$;
select private.expose('public.loewen_get()');

-- The pitch: three different Löwen, each with cash (a share of the company's value) for a share of the company.
create function public.loewen_pitch(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'loewen_pitch');
  c game.companies;
  v_value bigint;
  v_offers jsonb := '[]';
  v_lion int;
  v_share int;
  i int;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  perform private.require_level(v_player, 'loewen');
  select * into c from game.companies where owner_id = v_player and closed_at is null for update;
  if not found then
    perform private.fail('no_own_company');
  end if;
  if exists (select 1 from game.loewen_pitches where company_id = c.id and week = private.week_start()) then
    perform private.fail('already_done');
  end if;
  if c.investor_pct >= private.cfg_num('loewen.max_share_pct') then
    perform private.fail('upgrade_max');
  end if;
  v_value := greatest(private.company_value(v_player), 1);
  for v_lion in select n from generate_series(0, private.cfg_num('loewen.count')::int - 1) n
                order by private.rand() limit private.cfg_num('loewen.offers')::int loop
    v_share := least(private.cfg_num('loewen.max_share_pct')::int - c.investor_pct,
      floor(private.rand_between(private.cfg_num('loewen.share_min_pct'), private.cfg_num('loewen.share_max_pct') + 1))::int);
    v_offers := v_offers || jsonb_build_object('lion', v_lion, 'share_pct', v_share,
      'cents', round(v_value * private.rand_between(private.cfg_num('loewen.cash_min_pct'), private.cfg_num('loewen.cash_max_pct')) / 100
                     * v_share / ((private.cfg_num('loewen.share_min_pct') + private.cfg_num('loewen.share_max_pct')) / 2))::bigint);
  end loop;
  insert into game.loewen_pitches (company_id, week, offers) values (c.id, private.week_start(), v_offers);
  return private.request_done(v_player, p_request_id, private.loewen_doc(v_player));
end $$;
select private.expose('public.loewen_pitch(uuid)');

-- Deal (an offer's index) or no deal (null).
create function public.loewen_deal(p_request_id uuid, p_offer int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
  v_replay jsonb := private.request_begin(v_player, p_request_id, 'loewen_deal');
  c game.companies;
  l game.loewen_pitches;
  o jsonb;
begin
  if v_replay is not null then
    return v_replay;
  end if;
  select * into c from game.companies where owner_id = v_player and closed_at is null for update;
  if not found then
    perform private.fail('no_own_company');
  end if;
  select * into l from game.loewen_pitches where company_id = c.id and week = private.week_start() and chosen is null for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if p_offer is null then
    update game.loewen_pitches set chosen = -1 where company_id = c.id and week = l.week;
    return private.request_done(v_player, p_request_id, private.loewen_doc(v_player));
  end if;
  o := l.offers -> p_offer;
  if o is null or p_offer < 0 then
    perform private.fail('invalid_request');
  end if;
  update game.companies set cash_cents = cash_cents + (o ->> 'cents')::bigint,
    investor_pct = least(private.cfg_num('loewen.max_share_pct')::int, investor_pct + (o ->> 'share_pct')::int)
  where id = c.id;
  update game.loewen_pitches set chosen = p_offer where company_id = c.id and week = l.week;
  perform private.emit(v_player, 'loewen_deal');
  perform private.feed_add('loewen', jsonb_build_object('name', (select username from game.players where id = v_player),
    'company', c.name, 'lion', (o ->> 'lion')::int, 'cents', (o ->> 'cents')::bigint, 'share_pct', (o ->> 'share_pct')::int));
  return private.request_done(v_player, p_request_id, private.loewen_doc(v_player));
end $$;
select private.expose('public.loewen_deal(uuid, int)');
