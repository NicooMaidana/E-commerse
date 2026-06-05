import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import AdminSidebar from './AdminSidebar'

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard':     'Dashboard',
  '/admin/categorias':    'Categorías',
  '/admin/productos':     'Productos',
  '/admin/combos':        'Combos',
  '/admin/banners':       'Banners',
  '/admin/configuracion': 'Configuración',
  '/admin/pedidos':       'Pedidos',
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const pageTitle = PAGE_TITLES[pathname] ?? 'Admin'

  return (
    <div className="flex h-screen bg-[#14101c] overflow-hidden">
      <Helmet>
        <title>{pageTitle} | Alta GULA Admin</title>
      </Helmet>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#100c18] border-b border-[#3a2e4f]/20 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-stone-400 hover:text-amber-300 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-black text-amber-400">Alta</span>
            <span className="text-lg font-black text-yellow-400">GULA</span>
            <span className="text-[9px] font-black text-stone-600 ml-1.5 uppercase tracking-widest">
              Admin
            </span>
          </div>
          <span className="text-[11px] font-black text-stone-600 ml-auto uppercase tracking-widest">
            {pageTitle}
          </span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
