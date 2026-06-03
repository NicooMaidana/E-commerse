-- ============================================================
-- Products / combos with zero confirmed sales in a date range
-- Run in Supabase SQL editor
-- ============================================================

create or replace function products_without_sales(p_from timestamptz, p_to timestamptz)
returns table(item_name text, item_type text, stock int)
language sql
security definer
stable
set search_path = public
as $$
  -- Visible products with no confirmed order_item in the period
  select p.name::text    as item_name,
         'product'::text as item_type,
         p.stock
    from products p
   where p.visible = true
     and not exists (
           select 1
             from order_items oi
             join orders o on o.id = oi.order_id
            where oi.product_id  = p.id
              and o.status       = 'confirmed'
              and o.confirmed_at >= p_from
              and o.confirmed_at <  p_to
         )

  union all

  -- Visible combos with no confirmed order_item in the period
  select c.name::text, 'combo'::text, null::int
    from combos c
   where c.visible = true
     and not exists (
           select 1
             from order_items oi
             join orders o on o.id = oi.order_id
            where oi.combo_id    = c.id
              and o.status       = 'confirmed'
              and o.confirmed_at >= p_from
              and o.confirmed_at <  p_to
         )

  order by item_type, item_name;
$$;

revoke execute on function products_without_sales(timestamptz, timestamptz) from public;
grant  execute on function products_without_sales(timestamptz, timestamptz) to authenticated;
