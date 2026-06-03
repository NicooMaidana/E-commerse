-- ============================================================
-- Reports RPC functions — execute only for authenticated
-- Run in Supabase SQL editor
-- ============================================================

-- ── a) sales_summary ─────────────────────────────────────────

create or replace function sales_summary(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'total_revenue', coalesce(sum(total),  0),
    'orders_count',  count(*),
    'avg_ticket',    coalesce(avg(total),  0),
    'items_sold',    coalesce((
      select sum(oi.quantity)
        from order_items oi
        join orders o2 on o2.id = oi.order_id
       where o2.status = 'confirmed'
         and o2.confirmed_at >= p_from
         and o2.confirmed_at <  p_to
    ), 0)
  )
  from orders
  where status       = 'confirmed'
    and confirmed_at >= p_from
    and confirmed_at <  p_to;
$$;

revoke execute on function sales_summary(timestamptz, timestamptz) from public;
grant  execute on function sales_summary(timestamptz, timestamptz) to authenticated;

-- ── b) top_products ──────────────────────────────────────────

create or replace function top_products(
  p_from  timestamptz,
  p_to    timestamptz,
  p_limit int     default 10,
  p_order text    default 'desc'
)
returns table(item_name text, units_sold bigint, revenue numeric)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if p_order = 'asc' then
    return query
      select oi.item_name,
             sum(oi.quantity)::bigint   as units_sold,
             sum(oi.line_total)::numeric as revenue
        from order_items oi
        join orders o on o.id = oi.order_id
       where o.status       = 'confirmed'
         and o.confirmed_at >= p_from
         and o.confirmed_at <  p_to
       group by oi.item_name
       order by units_sold asc
       limit p_limit;
  else
    return query
      select oi.item_name,
             sum(oi.quantity)::bigint   as units_sold,
             sum(oi.line_total)::numeric as revenue
        from order_items oi
        join orders o on o.id = oi.order_id
       where o.status       = 'confirmed'
         and o.confirmed_at >= p_from
         and o.confirmed_at <  p_to
       group by oi.item_name
       order by units_sold desc
       limit p_limit;
  end if;
end;
$$;

revoke execute on function top_products(timestamptz, timestamptz, int, text) from public;
grant  execute on function top_products(timestamptz, timestamptz, int, text) to authenticated;

-- ── c) sales_by_day ──────────────────────────────────────────

create or replace function sales_by_day(p_from timestamptz, p_to timestamptz)
returns table(day date, orders_count bigint, revenue numeric)
language sql
security definer
stable
set search_path = public
as $$
  select confirmed_at::date         as day,
         count(*)::bigint           as orders_count,
         sum(total)::numeric        as revenue
    from orders
   where status       = 'confirmed'
     and confirmed_at >= p_from
     and confirmed_at <  p_to
   group by confirmed_at::date
   order by day;
$$;

revoke execute on function sales_by_day(timestamptz, timestamptz) from public;
grant  execute on function sales_by_day(timestamptz, timestamptz) to authenticated;

-- ── d) sales_by_payment ──────────────────────────────────────

create or replace function sales_by_payment(p_from timestamptz, p_to timestamptz)
returns table(payment_method text, orders_count bigint, revenue numeric)
language sql
security definer
stable
set search_path = public
as $$
  select payment_method,
         count(*)::bigint    as orders_count,
         sum(total)::numeric as revenue
    from orders
   where status       = 'confirmed'
     and confirmed_at >= p_from
     and confirmed_at <  p_to
   group by payment_method
   order by revenue desc;
$$;

revoke execute on function sales_by_payment(timestamptz, timestamptz) from public;
grant  execute on function sales_by_payment(timestamptz, timestamptz) to authenticated;

-- ── e) sales_by_delivery ─────────────────────────────────────

create or replace function sales_by_delivery(p_from timestamptz, p_to timestamptz)
returns table(delivery_type text, orders_count bigint, revenue numeric)
language sql
security definer
stable
set search_path = public
as $$
  select delivery_type,
         count(*)::bigint    as orders_count,
         sum(total)::numeric as revenue
    from orders
   where status       = 'confirmed'
     and confirmed_at >= p_from
     and confirmed_at <  p_to
   group by delivery_type
   order by revenue desc;
$$;

revoke execute on function sales_by_delivery(timestamptz, timestamptz) from public;
grant  execute on function sales_by_delivery(timestamptz, timestamptz) to authenticated;
