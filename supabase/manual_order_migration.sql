-- ── Manual order support ─────────────────────────────────────────────────────
-- 1. Add `source` column to orders (web | manual)
-- 2. Update create_order_with_items to accept optional p_source parameter

alter table orders
  add column if not exists source text not null default 'web';

-- ── Updated create_order_with_items ──────────────────────────────────────────
-- Adds optional p_source parameter (default 'web') for backward compatibility.
-- Existing callers (web checkout) continue to work without passing p_source.

-- Revoke old grant (signature changed) before replacing
revoke execute on function create_order_with_items(
  text, text, text, text, text, text, numeric, numeric, numeric, jsonb
) from anon, authenticated;

create or replace function create_order_with_items(
  p_reference      text,
  p_customer_name  text,
  p_delivery_type  text,
  p_address        text,
  p_comment        text,
  p_payment_method text,
  p_subtotal       numeric,
  p_delivery_cost  numeric,
  p_total          numeric,
  p_items          jsonb,
  p_source         text = 'web'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item     jsonb;
begin
  insert into orders (
    reference, customer_name, delivery_type, address, comment,
    payment_method, subtotal, delivery_cost, total, source
  ) values (
    p_reference, p_customer_name, p_delivery_type, p_address, p_comment,
    p_payment_method, p_subtotal, p_delivery_cost, p_total, p_source
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into order_items (
      order_id, product_id, combo_id,
      item_name, unit_price, quantity, line_total
    ) values (
      v_order_id,
      nullif(v_item->>'product_id', '')::uuid,
      nullif(v_item->>'combo_id',   '')::uuid,
      v_item->>'item_name',
      (v_item->>'unit_price')::numeric,
      (v_item->>'quantity')::int,
      (v_item->>'line_total')::numeric
    );
  end loop;

  return v_order_id;
end;
$$;

grant execute on function create_order_with_items(
  text, text, text, text, text, text, numeric, numeric, numeric, jsonb, text
) to anon, authenticated;
