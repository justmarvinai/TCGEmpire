-- Site layout "Nachtschicht": the home page document. For now the latest Holo-or-better pull;
-- alpha_04 adds the net worth history for the chart.

create index card_copies_pulled on game.card_copies (owner_id, pulled_at desc);

create function public.home_get() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_player uuid := private.require_player();
begin
  return jsonb_build_object('last_hit', (
    select jsonb_build_object('card_id', c.card_id, 'tier', d.tier, 'value_cents', private.card_value(c.card_id), 'pulled_at', c.pulled_at)
    from game.card_copies c
    join game.card_defs d on d.id = c.card_id
    where c.owner_id = v_player
    order by c.pulled_at desc
    limit 1
  ));
end $$;
select private.expose('public.home_get()');
