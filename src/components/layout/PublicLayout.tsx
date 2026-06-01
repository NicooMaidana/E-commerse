import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-[#1a1008] text-stone-100">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
