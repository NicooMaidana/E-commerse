import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Tag, Package, Gift,
  Megaphone, Settings, ClipboardList, BarChart2, LogOut, ChevronRight,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { PENDING_COUNT_KEY } from '../../pages/admin/Orders'

const NAV: { to: string; icon: React.ElementType; label: string; pendingBadge?: true }[] = [
  { to: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/categorias',    icon: Tag,             label: 'Categorías' },
  { to: '/admin/productos',     icon: Package,         label: 'Productos' },
  { to: '/admin/combos',        icon: Gift,            label: 'Combos' },
  { to: '/admin/banners',       icon: Megaphone,       label: 'Banners' },
  { to: '/admin/configuracion', icon: Settings,        label: 'Configuración' },
  { to: '/admin/pedidos',       icon: ClipboardList,   label: 'Pedidos', pendingBadge: true },
  { to: '/admin/informes',      icon: BarChart2,        label: 'Informes'  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function AdminSidebar({ open, onClose }: Props) {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  const { data: pendingCount = 0 } = useQuery({
    queryKey: PENDING_COUNT_KEY,
    queryFn: async () => {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      return count ?? 0
    },
    refetchInterval: 30_000,
  })

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <aside
      className={`
        fixed md:relative inset-y-0 left-0 z-50 md:z-auto
        w-60 shrink-0 bg-[#0d0804] border-r border-orange-900/20
        flex flex-col h-full
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      {/* Logo + user */}
      <div className="px-5 py-5 border-b border-orange-900/15">
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl font-black text-orange-500">Alta</span>
          <span className="text-xl font-black text-yellow-400">GULA</span>
          <span className="text-[10px] font-black text-stone-600 ml-2 uppercase tracking-widest">
            Admin
          </span>
        </div>
        {session?.user?.email && (
          <p className="text-[11px] text-stone-600 mt-0.5 truncate">
            {session.user.email}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label, pendingBadge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold
               transition-all duration-150 ${
                isActive
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                  : 'text-stone-500 hover:text-stone-300 hover:bg-white/[0.03] border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={isActive ? 'text-orange-400' : 'text-stone-600'}
                />
                <span className="flex-1">{label}</span>
                {pendingBadge && pendingCount > 0 && (
                  <span className="text-[10px] font-black bg-yellow-500/20 text-yellow-400
                    px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {pendingCount}
                  </span>
                )}
                {isActive && (
                  <ChevronRight size={13} className="text-orange-700" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4 pt-3 border-t border-orange-900/15">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm
            font-bold text-stone-600 hover:text-red-400 hover:bg-red-500/5
            transition-all duration-150"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
