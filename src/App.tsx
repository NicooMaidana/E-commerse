import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'

import PublicLayout from './components/layout/PublicLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/admin/AdminLayout'

import Home from './pages/Home'
import AdminLogin from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import AdminCategories from './pages/admin/Categories'
import AdminProducts from './pages/admin/Products'
import AdminCombos from './pages/admin/Combos'
import AdminBanners from './pages/admin/Banners'
import AdminSettings from './pages/admin/Settings'
import AdminOrders  from './pages/admin/Orders'
import AdminReports from './pages/admin/Reports'

function AdminIndex() {
  const { session, loading } = useAuth()
  if (loading) return null
  return <Navigate to={session ? '/admin/dashboard' : '/admin/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Single-page public site */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          {/* Legacy routes — redirect back to the single page */}
          <Route path="/productos" element={<Navigate to="/" replace />} />
          <Route path="/checkout"  element={<Navigate to="/" replace />} />
        </Route>

        {/* Admin auth (no layout) */}
        <Route path="/admin"       element={<AdminIndex />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected admin routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard"     element={<Dashboard />} />
            <Route path="/admin/categorias"    element={<AdminCategories />} />
            <Route path="/admin/productos"     element={<AdminProducts />} />
            <Route path="/admin/combos"        element={<AdminCombos />} />
            <Route path="/admin/banners"       element={<AdminBanners />} />
            <Route path="/admin/configuracion" element={<AdminSettings />} />
            <Route path="/admin/pedidos"       element={<AdminOrders />} />
            <Route path="/admin/informes"      element={<AdminReports />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
