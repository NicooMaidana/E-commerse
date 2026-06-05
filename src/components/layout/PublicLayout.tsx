import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import CartDrawer from '../CartDrawer'

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-[#14101c] text-stone-100">
      <Navbar />
      <CartDrawer />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
