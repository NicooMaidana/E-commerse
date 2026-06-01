import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Package, AlertTriangle, Gift, TrendingDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type CriticalProduct = {
  id: string
  name: string
  stock: number
  categories: { name: string } | null
}

function useStats() {
  const total = useQuery({
    queryKey: ['admin', 'stats', 'total'],
    queryFn: async () => {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
      return count ?? 0
    },
  })

  const outOfStock = useQuery({
    queryKey: ['admin', 'stats', 'outOfStock'],
    queryFn: async () => {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('stock', 0)
      return count ?? 0
    },
  })

  const combos = useQuery({
    queryKey: ['admin', 'stats', 'combos'],
    queryFn: async () => {
      const { count } = await supabase
        .from('combos')
        .select('*', { count: 'exact', head: true })
        .eq('visible', true)
      return count ?? 0
    },
  })

  const critical = useQuery<CriticalProduct[]>({
    queryKey: ['admin', 'stats', 'critical'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, stock, categories(name)')
        .lte('stock', 5)
        .order('stock', { ascending: true })
        .limit(20)
      return (data ?? []) as unknown as CriticalProduct[]
    },
  })

  return { total, outOfStock, combos, critical }
}

export default function Dashboard() {
  const { total, outOfStock, combos, critical } = useStats()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-100 uppercase tracking-tight">
          Dashboard
        </h1>
        <p className="text-stone-600 text-sm mt-1">Resumen general del negocio.</p>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <StatCard
          label="Total productos"
          value={total.data}
          loading={total.isLoading}
          icon={<Package size={20} className="text-orange-400" />}
          color="text-orange-400"
        />
        <StatCard
          label="Sin stock"
          value={outOfStock.data}
          loading={outOfStock.isLoading}
          icon={<AlertTriangle size={20} className="text-red-400" />}
          color="text-red-400"
        />
        <StatCard
          label="Combos activos"
          value={combos.data}
          loading={combos.isLoading}
          icon={<Gift size={20} className="text-yellow-400" />}
          color="text-yellow-400"
        />
      </div>

      {/* Critical stock table */}
      <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-orange-900/15">
          <TrendingDown size={16} className="text-orange-500" />
          <h2 className="font-black text-stone-200 uppercase tracking-widest text-xs">
            Stock crítico (≤ 5 unidades)
          </h2>
        </div>

        {critical.isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : critical.data?.length === 0 ? (
          <p className="p-8 text-center text-stone-600 text-sm font-bold">
            Sin productos en stock crítico 🎉
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orange-900/10">
                {['Producto', 'Categoría', 'Stock', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-3 text-[11px] font-black text-stone-600 uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {critical.data?.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-orange-900/10 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-3.5 font-bold text-stone-200">{p.name}</td>
                  <td className="px-6 py-3.5 text-stone-500">
                    {p.categories?.name ?? '—'}
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`font-black text-base ${
                        p.stock === 0 ? 'text-red-400' : 'text-yellow-400'
                      }`}
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <Link
                      to="/admin/productos"
                      className="text-orange-500 hover:text-orange-400 font-bold text-xs
                        uppercase tracking-wide transition-colors"
                    >
                      Editar →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  loading,
  icon,
  color,
}: {
  label: string
  value: number | undefined
  loading: boolean
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-black text-stone-600 uppercase tracking-widest">
          {label}
        </p>
        {icon}
      </div>
      {loading ? (
        <div className="h-9 w-16 bg-stone-800/50 rounded-lg animate-pulse" />
      ) : (
        <p className={`text-4xl font-black ${color}`}>{value ?? 0}</p>
      )}
    </div>
  )
}
