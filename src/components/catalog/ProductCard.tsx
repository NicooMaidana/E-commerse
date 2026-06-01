import { Plus } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import type { CatalogItem } from '../../types'

interface Props {
  item: CatalogItem
}

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 0 })

export default function ProductCard({ item }: Props) {
  const { addItem } = useCart()

  return (
    <article
      className="bg-[#221408] border border-orange-900/20 rounded-2xl overflow-hidden
        w-44 flex-shrink-0 flex flex-col
        transition-all duration-200 ease-out
        hover:border-orange-600/50
        hover:shadow-lg hover:shadow-orange-500/15
        hover:-translate-y-1
        cursor-default"
    >
      {/* Image */}
      <div className="relative h-36 bg-[#2d1a09]">
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

        {/* Stock badge */}
        <span
          className={`absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5
            rounded-full uppercase tracking-wider border ${
            item.inStock
              ? 'bg-green-950/90 text-green-400 border-green-800/50'
              : 'bg-red-950/90 text-red-400 border-red-800/50'
          }`}
        >
          {item.inStock ? 'EN STOCK' : 'SIN STOCK'}
        </span>

        {/* Combo badge */}
        {item.type === 'combo' && (
          <span
            className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5
              rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-600/30
              uppercase tracking-wider"
          >
            COMBO
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-bold text-stone-100 leading-tight line-clamp-2">
          {item.name}
        </p>

        {item.components && (
          <p className="text-[10px] text-stone-600 line-clamp-2 leading-tight">
            {item.components}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-orange-400 font-black text-base leading-none">
            ${fmt(item.price)}
          </span>

          {item.inStock && (
            <button
              onClick={() =>
                addItem({
                  id:         item.id,
                  type:       item.type,
                  name:       item.name,
                  price:      item.price,
                  image:      item.image,
                  components: item.components,
                })
              }
              className="w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-400
                flex items-center justify-center text-white
                transition-colors active:scale-95"
              aria-label={`Agregar ${item.name} al carrito`}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
