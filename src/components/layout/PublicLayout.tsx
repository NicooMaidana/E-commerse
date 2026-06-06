import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import CartDrawer from '../CartDrawer'

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-[#14101c] text-stone-100 flex flex-col">
      <Navbar />
      <CartDrawer />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
