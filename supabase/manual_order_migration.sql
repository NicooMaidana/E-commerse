-- ── Manual order support ─────────────────────────────────────────────────────
-- 1. Add `source` column to orders (web | manual)
-- 2. Replace create_order_with_items with a version that includes p_source
--
-- IMPORTANT: CREATE OR REPLACE with a different parameter list creates a NEW
-- overload instead of replacing the old one. That leaves two functions: the
-- old (10-param, revoked) and the new (11-param). PostgreSQL then picks the
-- revoked one for 10-arg calls → permission denied for the web checkout.
-- The correct fix is to DROP the old signature first so only the 11-param
-- version exists; PostgreSQL will use its default for callers that omit p_source.

alter table orders
  add column if not exists source text not null default 'web';

-- Drop old signature so only the new one (with p_source default) exists
drop function if exists create_order_with_items(
  text, text, text, text, text, text, numeric, numeric, numeric, jsonb
);

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
