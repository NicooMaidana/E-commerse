import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Download, TrendingUp, ShoppingBag, Users, Package } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Helpers ────────────────────────────────────────────────────────────────────

const money = (n: number) =>
  '$ ' + Math.round(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })

const moneyShort = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`
  return `$${Math.round(n)}`
}

function startOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r
}
function endOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(23, 59, 59, 999); return r
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function fmtIso(d: Date) { return d.toISOString() }
function fmtInputDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function labelDay(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Preset = 'today' | '7d' | 'month' | 'prev_month' | 'custom'

interface DateRange { from: Date; to: Date }

interface Summary {
  total_revenue: number
  orders_count:  number
  avg_ticket:    number
  items_sold:    number
}

interface TopProduct {
  item_name:  string
  units_sold: number
  revenue:    number
}

interface DaySale {
  day:          string
  orders_count: number
  revenue:      number
}

interface PaymentSale  { payment_method: string; orders_count: number; revenue: number }
interface DeliverySale { delivery_type:  string; orders_count: number; revenue: number }
interface NoSalesItem  { item_name: string; item_type: 'product' | 'combo'; stock: number | null }

const PIE_COLORS = ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7']

// ── Preset helpers ─────────────────────────────────────────────────────────────

function presetRange(p: Preset, custom: DateRange): DateRange {
  const now = new Date()
  switch (p) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }
    case '7d': {
      const from = new Date(now); from.setDate(from.getDate() - 6)
      return { from: startOfDay(from), to: endOfDay(now) }
    }
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'prev_month': {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return { from: startOfMonth(prev), to: endOfMonth(prev) }
    }
    case 'custom':
      return custom
  }
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ h = 'h-6', w = 'w-full' }: { h?: string; w?: string }) {
  return <div className={`${h} ${w} bg-stone-800/60 rounded-lg animate-pulse`} />
}

// ── KPI card ───────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, loading, color = 'text-orange-400',
}: {
  label: string; value: string; icon: React.ReactNode; loading: boolean; color?: string
}) {
  return (
    <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-black text-stone-600 uppercase tracking-widest">{label}</p>
        {icon}
      </div>
      {loading
        ? <Skeleton h="h-9" w="w-28" />
        : <p className={`text-3xl font-black ${color}`}>{value}</p>}
    </div>
  )
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1008] border border-orange-900/30 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-stone-400 mb-0.5">{label}</p>
      <p className="font-black text-orange-400">{money(payload[0].value)}</p>
    </div>
  )
}

function CountTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1008] border border-orange-900/30 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-stone-400 mb-0.5">{label}</p>
      <p className="font-black text-stone-200">{payload[0].value} pedidos</p>
    </div>
  )
}

// ── PieTooltip ─────────────────────────────────────────────────────────────────

function PieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1008] border border-orange-900/30 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-stone-400 mb-0.5 capitalize">{payload[0].name}</p>
      <p className="font-black text-orange-400">{money(payload[0].value)}</p>
    </div>
  )
}

// ── CSV export ─────────────────────────────────────────────────────────────────

function exportCsv(rows: TopProduct[], range: DateRange) {
  const header = 'Producto,Unidades vendidas,Ingresos\n'
  const body   = rows.map(r => `"${r.item_name}",${r.units_sold},${r.revenue}`).join('\n')
  const blob   = new Blob(['﻿' + header + body], { type: 'text/csv;charset=utf-8;' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href       = url
  a.download   = `ventas_${fmtInputDate(range.from)}_${fmtInputDate(range.to)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminReports() {
  const [preset, setPreset] = useState<Preset>('7d')
  const [custom, setCustom] = useState<DateRange>({
    from: startOfDay(new Date()),
    to:   endOfDay(new Date()),
  })

  const range = useMemo(() => presetRange(preset, custom), [preset, custom])

  const rangeKey = [fmtIso(range.from), fmtIso(range.to)]

  // ── Queries ────────────────────────────────────────────────

  const { data: summary, isLoading: loadingSummary } = useQuery<Summary>({
    queryKey: ['reports', 'summary', ...rangeKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('sales_summary', {
        p_from: fmtIso(range.from),
        p_to:   fmtIso(range.to),
      })
      if (error) throw error
      return data as Summary
    },
  })

  const { data: topDesc = [], isLoading: loadingTop } = useQuery<TopProduct[]>({
    queryKey: ['reports', 'top_desc', ...rangeKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('top_products', {
        p_from: fmtIso(range.from), p_to: fmtIso(range.to),
        p_limit: 10, p_order: 'desc',
      })
      if (error) throw error
      return (data ?? []) as TopProduct[]
    },
  })

  const { data: topAsc = [], isLoading: loadingTopAsc } = useQuery<TopProduct[]>({
    queryKey: ['reports', 'top_asc', ...rangeKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('top_products', {
        p_from: fmtIso(range.from), p_to: fmtIso(range.to),
        p_limit: 10, p_order: 'asc',
      })
      if (error) throw error
      return (data ?? []) as TopProduct[]
    },
  })

  const { data: byDay = [], isLoading: loadingByDay } = useQuery<DaySale[]>({
    queryKey: ['reports', 'by_day', ...rangeKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('sales_by_day', {
        p_from: fmtIso(range.from), p_to: fmtIso(range.to),
      })
      if (error) throw error
      return (data ?? []) as DaySale[]
    },
  })

  const { data: byPayment = [], isLoading: loadingPayment } = useQuery<PaymentSale[]>({
    queryKey: ['reports', 'by_payment', ...rangeKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('sales_by_payment', {
        p_from: fmtIso(range.from), p_to: fmtIso(range.to),
      })
      if (error) throw error
      return (data ?? []) as PaymentSale[]
    },
  })

  const { data: byDelivery = [], isLoading: loadingDelivery } = useQuery<DeliverySale[]>({
    queryKey: ['reports', 'by_delivery', ...rangeKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('sales_by_delivery', {
        p_from: fmtIso(range.from), p_to: fmtIso(range.to),
      })
      if (error) throw error
      return (data ?? []) as DeliverySale[]
    },
  })

  const {
    data: withoutSales = [],
    isLoading: loadingWithout,
    isError: errorWithout,
  } = useQuery<NoSalesItem[]>({
    queryKey: ['reports', 'without_sales', ...rangeKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('products_without_sales', {
        p_from: fmtIso(range.from), p_to: fmtIso(range.to),
      })
      if (error) throw error
      return (data ?? []) as NoSalesItem[]
    },
    retry: false,
  })

  // ── Derived ────────────────────────────────────────────────

  const noSales = !loadingSummary && (summary?.orders_count ?? 0) === 0

  const chartData = byDay.map(d => ({
    day:     labelDay(d.day),
    revenue: Number(d.revenue),
    orders:  Number(d.orders_count),
  }))

  const paymentPieData = byPayment.map(p => ({
    name:  p.payment_method === 'efectivo' ? 'Efectivo' : 'Transferencia',
    value: Number(p.revenue),
  }))

  const deliveryPieData = byDelivery.map(d => ({
    name:  d.delivery_type === 'delivery' ? 'Delivery' : 'Retiro',
    value: Number(d.revenue),
  }))

  // ── Render ─────────────────────────────────────────────────

  const PRESETS: { key: Preset; label: string }[] = [
    { key: 'today',      label: 'Hoy'           },
    { key: '7d',         label: 'Últimos 7 días' },
    { key: 'month',      label: 'Este mes'       },
    { key: 'prev_month', label: 'Mes anterior'   },
    { key: 'custom',     label: 'Personalizado'  },
  ]

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-stone-100 uppercase tracking-tight">Informes</h1>
          <p className="text-stone-600 text-sm mt-1">Solo ventas confirmadas.</p>
        </div>
        <button
          onClick={() => exportCsv([...topDesc, ...topAsc.filter(a => !topDesc.find(d => d.item_name === a.item_name))], range)}
          className="flex items-center gap-2 bg-[#2a1608] hover:bg-orange-500/10 border
            border-orange-900/30 hover:border-orange-500/40 text-stone-400 hover:text-orange-400
            font-black px-4 py-2.5 rounded-xl text-sm uppercase tracking-widest transition-colors"
        >
          <Download size={15} />
          Exportar CSV
        </button>
      </div>

      {/* Date range selector */}
      <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest
                transition-all border ${
                preset === key
                  ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                  : 'text-stone-600 border-transparent hover:text-stone-300 hover:bg-white/[0.03]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-black text-stone-600 uppercase tracking-widest">Desde</label>
              <input
                type="date"
                value={fmtInputDate(custom.from)}
                onChange={e => {
                  const d = new Date(e.target.value + 'T00:00:00')
                  setCustom(c => ({ ...c, from: startOfDay(d) }))
                }}
                className="bg-[#251608] border border-orange-900/25 rounded-xl px-3 py-1.5
                  text-stone-100 text-sm focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-black text-stone-600 uppercase tracking-widest">Hasta</label>
              <input
                type="date"
                value={fmtInputDate(custom.to)}
                onChange={e => {
                  const d = new Date(e.target.value + 'T00:00:00')
                  setCustom(c => ({ ...c, to: endOfDay(d) }))
                }}
                className="bg-[#251608] border border-orange-900/25 rounded-xl px-3 py-1.5
                  text-stone-100 text-sm focus:outline-none focus:border-orange-500/50"
              />
            </div>
          </div>
        )}

        <p className="text-[11px] text-stone-700 font-bold">
          {range.from.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })}
          {' — '}
          {range.to.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })}
        </p>
      </div>

      {/* No-sales message */}
      {noSales && (
        <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl p-12 text-center">
          <ShoppingBag size={48} className="text-stone-700 mx-auto mb-4" strokeWidth={1.5} />
          <p className="font-black text-stone-400 text-lg">Sin ventas confirmadas en este período</p>
          <p className="text-stone-600 text-sm mt-1">Probá con otro rango de fechas.</p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ingresos totales"
          value={money(summary?.total_revenue ?? 0)}
          loading={loadingSummary}
          icon={<TrendingUp size={20} className="text-orange-400" />}
        />
        <KpiCard
          label="Pedidos confirmados"
          value={String(summary?.orders_count ?? 0)}
          loading={loadingSummary}
          icon={<ShoppingBag size={20} className="text-yellow-400" />}
          color="text-yellow-400"
        />
        <KpiCard
          label="Ticket promedio"
          value={money(summary?.avg_ticket ?? 0)}
          loading={loadingSummary}
          icon={<Users size={20} className="text-blue-400" />}
          color="text-blue-400"
        />
        <KpiCard
          label="Unidades vendidas"
          value={String(summary?.items_sold ?? 0)}
          loading={loadingSummary}
          icon={<Package size={20} className="text-green-400" />}
          color="text-green-400"
        />
      </div>

      {/* Revenue chart */}
      <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl p-5">
        <h2 className="font-black text-stone-300 text-sm uppercase tracking-widest mb-5">
          Ingresos por día
        </h2>
        {loadingByDay ? (
          <div className="h-52 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-stone-600 text-sm font-bold">
            Sin datos
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={chartData.length > 20 ? 6 : 20}>
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#57534e', fontSize: 11, fontWeight: 700 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={moneyShort}
                  tick={{ fill: '#57534e', fontSize: 11, fontWeight: 700 }}
                  axisLine={false} tickLine={false} width={52}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(249,115,22,0.06)' }} />
                <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Orders-per-day chart */}
      <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl p-5">
        <h2 className="font-black text-stone-300 text-sm uppercase tracking-widest mb-5">
          Pedidos por día
        </h2>
        {loadingByDay ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-stone-600 text-sm font-bold">
            Sin datos
          </div>
        ) : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={chartData.length > 20 ? 6 : 20}>
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#57534e', fontSize: 11, fontWeight: 700 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#57534e', fontSize: 11, fontWeight: 700 }}
                  axisLine={false} tickLine={false} width={28}
                />
                <Tooltip content={<CountTooltip />} cursor={{ fill: 'rgba(249,115,22,0.06)' }} />
                <Bar dataKey="orders" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top products tables */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ProductTable title="Más vendidos" rows={topDesc} loading={loadingTop} />
        <ProductTable title="Menos vendidos" rows={topAsc} loading={loadingTopAsc} />
      </div>

      {/* Pie charts */}
      <div className="grid lg:grid-cols-2 gap-5">
        <PieCard
          title="Por método de pago"
          data={paymentPieData}
          loading={loadingPayment}
        />
        <PieCard
          title="Por tipo de envío"
          data={deliveryPieData}
          loading={loadingDelivery}
        />
      </div>

      {/* Items without sales */}
      <NoSalesCard rows={withoutSales} loading={loadingWithout} isError={errorWithout} />
    </div>
  )
}

// ── ProductTable ───────────────────────────────────────────────────────────────

function ProductTable({
  title, rows, loading,
}: {
  title: string
  rows: TopProduct[]
  loading: boolean
}) {
  return (
    <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-orange-900/15">
        <h2 className="font-black text-stone-300 text-sm uppercase tracking-widest">{title}</h2>
      </div>
      {loading ? (
        <div className="p-5 space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex justify-between gap-3">
              <Skeleton w="w-36" />
              <Skeleton w="w-12" />
              <Skeleton w="w-20" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="p-8 text-center text-stone-600 text-sm font-bold">Sin datos</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-orange-900/10">
              <th className="text-left px-5 py-2.5 text-[10px] font-black text-stone-600 uppercase tracking-wider">Producto</th>
              <th className="text-right px-5 py-2.5 text-[10px] font-black text-stone-600 uppercase tracking-wider">Unidades</th>
              <th className="text-right px-5 py-2.5 text-[10px] font-black text-stone-600 uppercase tracking-wider">Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-orange-900/10 last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-2.5 font-bold text-stone-200 max-w-[160px] truncate">
                  <span title={r.item_name}>{r.item_name}</span>
                </td>
                <td className="px-5 py-2.5 text-right text-stone-400 font-bold">{r.units_sold}</td>
                <td className="px-5 py-2.5 text-right text-orange-400 font-bold">{money(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── NoSalesCard ────────────────────────────────────────────────────────────────

function NoSalesCard({ rows, loading, isError }: { rows: NoSalesItem[]; loading: boolean; isError: boolean }) {
  const products = rows.filter(r => r.item_type === 'product')
  const combos   = rows.filter(r => r.item_type === 'combo')

  return (
    <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-orange-900/15 flex items-center gap-3">
        <h2 className="font-black text-stone-300 text-sm uppercase tracking-widest">
          Sin ventas en el período
        </h2>
        {!loading && rows.length > 0 && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full
            bg-red-500/15 text-red-400 border border-red-500/25">
            {rows.length}
          </span>
        )}
        {!loading && !isError && rows.length === 0 && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full
            bg-green-500/15 text-green-400 border border-green-500/25">
            Todo vendido
          </span>
        )}
      </div>

      {loading ? (
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          {[0, 1].map(col => (
            <div key={col} className="space-y-2">
              <Skeleton h="h-3" w="w-24" />
              {[1,2,3,4].map(i => <Skeleton key={i} h="h-4" w="w-40" />)}
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="px-5 py-8 text-center space-y-1">
          <p className="font-black text-red-400 text-sm">
            No se pudo cargar esta sección
          </p>
          <p className="text-stone-600 text-xs">
            Ejecutá <code className="text-stone-400 bg-stone-800 px-1.5 py-0.5 rounded">products_without_sales.sql</code> en el SQL Editor de Supabase.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="font-black text-green-400 text-sm">
            Todos los ítems del catálogo tuvieron ventas en este período
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-orange-900/15">
          {/* Products column */}
          <div className="p-5">
            <p className="text-[11px] font-black text-stone-600 uppercase tracking-widest mb-3">
              Productos sin ventas ({products.length})
            </p>
            {products.length === 0 ? (
              <p className="text-stone-700 text-xs italic font-bold">
                Todos los productos tuvieron ventas
              </p>
            ) : (
              <ul className="space-y-2">
                {products.map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-sm font-bold text-stone-300 truncate" title={item.item_name}>
                      {item.item_name}
                    </span>
                    {item.stock !== null && (
                      <span className={`text-xs font-black shrink-0 tabular-nums ${
                        item.stock <= 0 ? 'text-red-400'
                        : item.stock <= 5 ? 'text-yellow-400'
                        : 'text-stone-600'
                      }`}>
                        stock: {item.stock}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Combos column */}
          <div className="p-5">
            <p className="text-[11px] font-black text-stone-600 uppercase tracking-widest mb-3">
              Combos sin ventas ({combos.length})
            </p>
            {combos.length === 0 ? (
              <p className="text-stone-700 text-xs italic font-bold">
                Todos los combos tuvieron ventas
              </p>
            ) : (
              <ul className="space-y-2">
                {combos.map((item, i) => (
                  <li key={i} className="text-sm font-bold text-stone-300 truncate" title={item.item_name}>
                    {item.item_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── PieCard ────────────────────────────────────────────────────────────────────

function PieCard({
  title, data, loading,
}: {
  title: string
  data: { name: string; value: number }[]
  loading: boolean
}) {
  return (
    <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl p-5">
      <h2 className="font-black text-stone-300 text-sm uppercase tracking-widest mb-4">{title}</h2>
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-center text-stone-600 text-sm font-bold py-10">Sin datos</p>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                outerRadius={75}
                labelLine={false}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                formatter={(v) => (
                  <span style={{ color: '#a8a29e', fontSize: 12, fontWeight: 700 }}>{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
