import { X, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 0 })

export default function CartDrawer() {
  const {
    items, removeItem, updateQuantity, clearCart,
    totalPrice, isOpen, setIsOpen,
  } = useCart()

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity duration-300 ${
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/*
        Mobile  : bottom drawer, slides up   (translate-y-full → translate-y-0)
        Desktop : right drawer, slides left  (translate-x-full → translate-x-0)
      */}
      <aside
        className={`
          fixed z-50 bg-[#1c1108] flex flex-col shadow-2xl
          transition-transform duration-300 ease-in-out
          /* Mobile */
          bottom-0 left-0 right-0 max-h-[88vh] rounded-t-2xl
          /* Desktop */
          md:bottom-auto md:top-0 md:left-auto md:right-0
          md:h-full md:w-[360px] md:max-h-none md:rounded-none
          ${isOpen
            ? 'translate-y-0 md:translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-y-0 md:translate-x-full'
          }
        `}
      >
        {/* Drag handle — mobile only */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-stone-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-orange-900/30 shrink-0">
          <h2 className="font-black text-orange-400 uppercase tracking-widest text-sm flex items-center gap-2">
            <ShoppingBag size={17} />
            Tu pedido
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-stone-500 hover:text-white transition-colors"
            aria-label="Cerrar carrito"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-stone-600 py-16">
              <ShoppingBag size={48} strokeWidth={1.5} />
              <p className="font-bold text-sm">Tu carrito está vacío</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-[#271608] border border-orange-900/20 rounded-xl p-3 flex gap-3"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg bg-[#3a2010] flex-shrink-0 overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🍔
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-stone-100 truncate leading-tight">
                    {item.name}
                  </p>
                  {item.components && (
                    <p className="text-[11px] text-stone-600 truncate mt-0.5">
                      {item.components}
                    </p>
                  )}
                  <p className="text-orange-400 font-black text-sm mt-0.5">
                    ${fmt(item.price * item.quantity)}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded bg-[#3a2010] flex items-center justify-center
                        text-stone-400 hover:bg-orange-500 hover:text-white transition-colors"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-sm font-black w-5 text-center text-stone-200">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded bg-[#3a2010] flex items-center justify-center
                        text-stone-400 hover:bg-orange-500 hover:text-white transition-colors"
                    >
                      <Plus size={11} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto text-stone-700 hover:text-red-400 transition-colors"
                      aria-label={`Quitar ${item.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-4 pb-6 pt-3 border-t border-orange-900/30 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 font-bold text-sm uppercase tracking-wide">
                Total
              </span>
              <span className="text-2xl font-black text-orange-400">
                ${fmt(totalPrice)}
              </span>
            </div>

            <Link
              to="/checkout"
              onClick={() => setIsOpen(false)}
              className="block w-full bg-orange-500 hover:bg-orange-400 text-white
                font-black py-3 rounded-xl text-center text-sm uppercase
                tracking-widest transition-colors"
            >
              Completar datos del pedido
            </Link>

            <button
              onClick={clearCart}
              className="block w-full text-stone-600 hover:text-red-400 font-bold
                text-xs uppercase tracking-wider text-center transition-colors py-1"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
