import { useEffect, useRef, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { useCart } from '../../context/CartContext'
import { useSettings } from '../../hooks/useSettings'

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export default function Navbar() {
  const { totalItems, setIsOpen } = useCart()
  const { data: settings } = useSettings()

  // Bounce the cart badge whenever an item is added
  const [badgeBounce, setBadgeBounce] = useState(false)
  const prevTotal = useRef(totalItems)
  useEffect(() => {
    if (totalItems > prevTotal.current) {
      setBadgeBounce(true)
    }
    prevTotal.current = totalItems
  }, [totalItems])

  const whatsappUrl = settings?.whatsapp_number
    ? `https://wa.me/${settings.whatsapp_number}`
    : undefined

  return (
    <nav className="sticky top-0 z-40 bg-[#1d1729]/95 backdrop-blur-sm border-b border-[#3a2e4f]/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

        {/* Logo */}
        <a
          href="#inicio"
          onClick={scrollTo('inicio')}
          className="flex items-baseline gap-0.5 shrink-0"
        >
          <span className="text-2xl font-black text-amber-400 tracking-tight leading-none">
            Alta
          </span>
          <span className="text-2xl font-black text-yellow-400 tracking-tight leading-none">
            GULA
          </span>
        </a>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { id: 'inicio',    label: 'Inicio' },
            { id: 'productos', label: 'Productos' },
            { id: 'pedido',    label: 'Pedido' },
          ].map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={scrollTo(id)}
              className="text-xs font-black uppercase tracking-widest
                text-stone-400 hover:text-amber-300 transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 bg-green-700 hover:bg-green-600
                text-white text-xs font-black px-3 py-1.5 rounded-full uppercase
                tracking-wide transition-colors"
            >
              <FaWhatsapp size={14} />
              WhatsApp
            </a>
          )}

          {/* Cart → abre el drawer lateral */}
          <button
            onClick={() => setIsOpen(true)}
            className="relative p-2 text-stone-400 hover:text-amber-300 transition-colors"
            aria-label="Abrir carrito"
          >
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span
                key={totalItems}
                className={`absolute -top-1 -right-1 bg-amber-400 text-[#14101c]
                  text-[10px] font-black rounded-full w-[18px] h-[18px]
                  flex items-center justify-center leading-none
                  ${badgeBounce ? 'badge-bounce' : ''}`}
                onAnimationEnd={() => setBadgeBounce(false)}
              >
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}
