import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) return null

  return session ? <Outlet /> : <Navigate to="/admin/login" replace />
}
