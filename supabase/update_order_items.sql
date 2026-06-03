-- ============================================================
-- Migration: update_order_items RPC
-- Run in Supabase SQL editor
-- ============================================================

create or replace function update_order_items(
  p_order_id uuid,
  p_items    jsonb   -- [{product_id, combo_id, item_name, unit_price, quantity}]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order     orders%rowtype;
  v_item      order_items%rowtype;
  v_ci        combo_items%rowtype;
  v_pitem     jsonb;
  v_prod_id   uuid;
  v_comb_id   uuid;
  v_qty       int;
  v_new_stock int;
  v_prod_name text;
  v_negative  jsonb := '[]';
  v_subtotal  numeric;
  r           record;
begin
  -- a) lock row and validate
  select * into v_order from orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'No se puede editar un pedido cancelado';
  end if;

  -- b) stock reconciliation — only for confirmed orders
  if v_order.status = 'confirmed' then

    -- temp table accumulates net delta per product
    -- (positive = more consumed → stock falls; negative = less consumed → stock returns)
    create temp table if not exists _upd_delta (
      product_id uuid primary key,
      qty        int not null default 0
    ) on commit delete rows;
    delete from _upd_delta;

    -- undo old consumption (subtract: old items were consuming stock)
    for v_item in select * from order_items where order_id = p_order_id loop
      if v_item.product_id is not null then
        insert into _upd_delta values (v_item.product_id, -v_item.quantity)
        on conflict (product_id) do update set qty = _upd_delta.qty + excluded.qty;
      elsif v_item.combo_id is not null then
        for v_ci in select * from combo_items where combo_id = v_item.combo_id loop
          insert into _upd_delta values (v_ci.product_id, -(v_ci.quantity * v_item.quantity))
          on conflict (product_id) do update set qty = _upd_delta.qty + excluded.qty;
        end loop;
      end if;
    end loop;

    -- add new consumption
    for v_pitem in select * from jsonb_array_elements(p_items) loop
      v_prod_id := nullif(v_pitem->>'product_id', '')::uuid;
      v_comb_id := nullif(v_pitem->>'combo_id',   '')::uuid;
      v_qty     := (v_pitem->>'quantity')::int;

      if v_prod_id is not null then
        insert into _upd_delta values (v_prod_id, v_qty)
        on conflict (product_id) do update set qty = _upd_delta.qty + excluded.qty;
      elsif v_comb_id is not null then
        for v_ci in select * from combo_items where combo_id = v_comb_id loop
          insert into _upd_delta values (v_ci.product_id, v_ci.quantity * v_qty)
          on conflict (product_id) do update set qty = _upd_delta.qty + excluded.qty;
        end loop;
      end if;
    end loop;

    -- apply net deltas (skip zero-delta products)
    for r in select product_id, qty from _upd_delta where qty <> 0 loop
      update products
         set stock = stock - r.qty
       where id = r.product_id
      returning stock, name into v_new_stock, v_prod_name;

      if v_new_stock < 0 then
        v_negative := v_negative || jsonb_build_array(jsonb_build_object(
          'product_id', r.product_id,
          'name',       v_prod_name,
          'stock',      v_new_stock
        ));
      end if;
    end loop;

    delete from _upd_delta;
  end if;

  -- c) replace order_items atomically
  delete from order_items where order_id = p_order_id;

  for v_pitem in select * from jsonb_array_elements(p_items) loop
    insert into order_items (
      order_id, product_id, combo_id,
      item_name, unit_price, quantity, line_total
    ) values (
      p_order_id,
      nullif(v_pitem->>'product_id', '')::uuid,
      nullif(v_pitem->>'combo_id',   '')::uuid,
      v_pitem->>'item_name',
      (v_pitem->>'unit_price')::numeric,
      (v_pitem->>'quantity')::int,
      (v_pitem->>'unit_price')::numeric * (v_pitem->>'quantity')::int
    );
  end loop;

  -- d) recalculate and persist order totals
  select coalesce(sum(line_total), 0) into v_subtotal
    from order_items where order_id = p_order_id;

  update orders
     set subtotal = v_subtotal,
         total    = v_subtotal + delivery_cost
   where id = p_order_id;

  -- e) return updated totals + negative-stock products
  return jsonb_build_object(
    'negative_stock', v_negative,
    'subtotal',       v_subtotal,
    'total',          v_subtotal + v_order.delivery_cost
  );
end;
$$;

revoke execute on function update_order_items(uuid, jsonb) from public;
grant  execute on function update_order_items(uuid, jsonb) to authenticated;
