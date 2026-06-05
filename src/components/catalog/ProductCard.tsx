import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import type { CatalogItem } from '../../types'

interface Props {
  item: CatalogItem
}

interface Particle {
  id: number
  x: number
  y: number
}

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 0 })

export default function ProductCard({ item }: Props) {
  const { addItem } = useCart()

  const [particles, setParticles] = useState<Particle[]>([])
  const [popKey,    setPopKey]    = useState(0)
  const particleId = useRef(0)
  const btnRef     = useRef<HTMLButtonElement>(null)

  const handleAdd = () => {
    addItem({
      id:         item.id,
      type:       item.type,
      name:       item.name,
      price:      item.price,
      image:      item.image,
      components: item.components,
    })

    setPopKey(k => k + 1)

    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const id   = particleId.current++
      const x    = rect.left + rect.width  / 2
      const y    = rect.top  + rect.height / 2
      setParticles(prev => [...prev, { id, x, y }])
      setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 650)
    }
  }

  return (
    <>
      <article
        className="bg-[#1d1729] border border-[#3a2e4f]/30 rounded-2xl overflow-hidden
          w-44 flex-shrink-0 flex flex-col
          transition-all duration-200 ease-out
          hover:border-amber-400
          hover:-translate-y-0.5
          cursor-default"
      >
        {/* Image */}
        <div className="relative h-36 bg-[#14101c]">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl select-none">
              🍔
            </div>
          )}

          {/* Stock badge — top right */}
          <span
            className={`absolute top-2 right-2 text-[9px] font-black px-2 py-0.5
              rounded-full uppercase tracking-wider border ${
              item.inStock
                ? 'bg-amber-400 text-[#14101c] border-amber-300'
                : 'bg-red-500/90 text-white border-red-400/50'
            }`}
          >
            {item.inStock ? 'EN STOCK' : 'SIN STOCK'}
          </span>

          {/* Combo badge */}
          {item.type === 'combo' && (
            <span
              className="absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5
                rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-600/30
                uppercase tracking-wider"
            >
              COMBO
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-3 flex flex-col gap-1.5 flex-1">
          <p className="text-[13px] font-bold text-stone-100 leading-tight line-clamp-2 uppercase">
            {item.name}
          </p>

          {item.components && (
            <p className="text-[10px] text-stone-500 line-clamp-2 leading-tight">
              {item.components}
            </p>
          )}

          <div className="mt-auto pt-2 flex flex-col gap-2">
            <span className="text-amber-400 font-black text-base leading-none">
              ARS$ {fmt(item.price)}
            </span>

            {item.inStock ? (
              <button
                ref={btnRef}
                onClick={handleAdd}
                className="w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300
                  text-[#14101c] text-sm font-black transition-colors
                  flex items-center justify-center gap-1"
                aria-label={`Agregar ${item.name} al carrito`}
              >
                <span key={popKey} className="btn-pop flex items-center gap-1">
                  <Plus size={14} strokeWidth={3} />
                  Agregar
                </span>
              </button>
            ) : (
              <button
                disabled
                className="w-full py-2 rounded-xl bg-[#261d36] border border-[#3a2e4f]/30
                  text-stone-500 text-sm font-black cursor-not-allowed"
              >
                Sin stock
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Floating "+1" particles rendered outside the clipped card */}
      {particles.length > 0 && createPortal(
        particles.map(p => (
          <div
            key={p.id}
            className="cart-particle"
            style={{ left: p.x, top: p.y }}
          >
            +1
          </div>
        )),
        document.body
      )}
    </>
  )
}
