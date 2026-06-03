-- ============================================================
-- Migration: orders persistence
-- Run this script in the Supabase SQL editor
-- ============================================================

-- ── 1. Tables ─────────────────────────────────────────────

create table orders (
  id             uuid        primary key default gen_random_uuid(),
  reference      text        unique not null,
  customer_name  text        not null,
  delivery_type  text        not null,
  address        text,
  comment        text,
  payment_method text        not null,
  subtotal       numeric     not null,
  delivery_cost  numeric     not null default 0,
  total          numeric     not null,
  status         text        not null default 'pending',
  created_at     timestamptz not null default now(),
  confirmed_at   timestamptz
);

create table order_items (
  id          uuid    primary key default gen_random_uuid(),
  order_id    uuid    not null references orders(id) on delete cascade,
  product_id  uuid    references products(id),
  combo_id    uuid    references combos(id),
  item_name   text    not null,
  unit_price  numeric not null,
  quantity    int     not null,
  line_total  numeric not null
);

-- ── 2. Indexes ────────────────────────────────────────────

create index order_items_order_id_idx on order_items(order_id);
create index orders_status_idx        on orders(status);

-- ── 3. RLS ────────────────────────────────────────────────

alter table orders      enable row level security;
alter table order_items enable row level security;

-- orders: public insert; authenticated select/update/delete
create policy "public_insert_orders"
  on orders for insert to anon, authenticated
  with check (true);

create policy "auth_select_orders"
  on orders for select to authenticated
  using (true);

create policy "auth_update_orders"
  on orders for update to authenticated
  using (true);

create policy "auth_delete_orders"
  on orders for delete to authenticated
  using (true);

-- order_items: same pattern
create policy "public_insert_order_items"
  on order_items for insert to anon, authenticated
  with check (true);

create policy "auth_select_order_items"
  on order_items for select to authenticated
  using (true);

create policy "auth_update_order_items"
  on order_items for update to authenticated
  using (true);

create policy "auth_delete_order_items"
  on order_items for delete to authenticated
  using (true);

-- ── 4. create_order_with_items (public RPC) ───────────────
-- SECURITY DEFINER so the atomic insert works regardless of
-- the caller's role. Granted to anon + authenticated.

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
  p_items          jsonb
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
    payment_method, subtotal, delivery_cost, total
  ) values (
    p_reference, p_customer_name, p_delivery_type, p_address, p_comment,
    p_payment_method, p_subtotal, p_delivery_cost, p_total
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
  text, text, text, text, text, text, numeric, numeric, numeric, jsonb
) to anon, authenticated;

-- ── 5. confirm_order (authenticated only) ────────────────
-- Sets status → confirmed, discounts stock for every item.
-- Returns jsonb { negative_stock: [{product_id, name, stock}] }
-- Stock is allowed to go negative; the admin is just warned.

create or replace function confirm_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order        orders%rowtype;
  v_item         order_items%rowtype;
  v_ci           combo_items%rowtype;
  v_new_stock    int;
  v_product_name text;
  v_negative     jsonb := '[]'::jsonb;
begin
  select * into v_order
    from orders
   where id = p_order_id
     for update;

  if not found or v_order.status <> 'pending' then
    raise exception 'Pedido no encontrado o ya procesado';
  end if;

  for v_item in
    select * from order_items where order_id = p_order_id
  loop
    if v_item.product_id is not null then
      update products
         set stock = stock - v_item.quantity
       where id = v_item.product_id
      returning stock, name into v_new_stock, v_product_name;

      if v_new_stock < 0 then
        v_negative := v_negative || jsonb_build_array(jsonb_build_object(
          'product_id', v_item.product_id,
          'name',       v_product_name,
          'stock',      v_new_stock
        ));
      end if;

    elsif v_item.combo_id is not null then
      for v_ci in
        select * from combo_items where combo_id = v_item.combo_id
      loop
        update products
           set stock = stock - (v_ci.quantity * v_item.quantity)
         where id = v_ci.product_id
        returning stock, name into v_new_stock, v_product_name;

        if v_new_stock < 0 then
          v_negative := v_negative || jsonb_build_array(jsonb_build_object(
            'product_id', v_ci.product_id,
            'name',       v_product_name,
            'stock',      v_new_stock
          ));
        end if;
      end loop;
    end if;
  end loop;

  update orders
     set status = 'confirmed', confirmed_at = now()
   where id = p_order_id;

  return jsonb_build_object('negative_stock', v_negative);
end;
$$;

revoke execute on function confirm_order(uuid) from public;
grant  execute on function confirm_order(uuid) to authenticated;

-- ── 6. cancel_order (authenticated only) ─────────────────
-- Sets status → cancelled if pending. Does not touch stock.

create or replace function cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order
    from orders
   where id = p_order_id
     for update;

  if not found or v_order.status <> 'pending' then
    raise exception 'Pedido no encontrado o ya procesado';
  end if;

  update orders
     set status = 'cancelled'
   where id = p_order_id;
end;
$$;

revoke execute on function cancel_order(uuid) from public;
grant  execute on function cancel_order(uuid) to authenticated;
