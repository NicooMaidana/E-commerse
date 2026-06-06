import { useState } from 'react'
import {
  ArrowRight, MessageCircle, Search, X,
  Minus, Plus, Trash2, ShoppingBag, AlertTriangle,
} from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'

import Ticker from '../components/Ticker'
import CategoryFilter from '../components/catalog/CategoryFilter'
import CategoryRow from '../components/catalog/CategoryRow'
import ProductCardSkeleton from '../components/catalog/ProductCardSkeleton'

import { useCategories, useCatalogItems } from '../hooks/useCatalog'
import { useSettings } from '../hooks/useSettings'
import { useCart } from '../context/CartContext'
import type { CartItem } from '../types'
import { supabase } from '../lib/supabase'

/* ── smooth-scroll helper (also used by Navbar) ── */
const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 0 })

/* ════════════════════════════════════════
   HOME — single page, three sections
   ════════════════════════════════════════ */
export default function Home() {
  const { data: settings } = useSettings()
  const whatsappUrl = settings?.whatsapp_number
    ? `https://wa.me/${settings.whatsapp_number}`
    : undefined

  const description =
    'Golosinas, bebidas y snacks llegando hasta tu puerta. Pedí por WhatsApp y recibís en minutos.'

  return (
    <>
      <Helmet>
        <title>Alta GULA Delivery | Pedí ahora</title>
        <meta name="description" content={description} />
        <meta property="og:title"       content="Alta GULA Delivery | Pedí ahora" />
        <meta property="og:description" content={description} />
        <meta property="og:image"       content="/og-image.png" />
        <meta property="og:type"        content="website" />
        <meta name="twitter:card"       content="summary_large_image" />
      </Helmet>

      {/* ── 1. HERO ── */}
      <section id="inicio" className="scroll-mt-16">
        <Ticker />
        <HeroSection
          whatsappUrl={whatsappUrl}
        />
      </section>

      {/* ── 2. CATÁLOGO ── */}
      <section id="productos" className="scroll-mt-16 border-t border-[#3a2e4f]/20">
        <CatalogSection />
      </section>

      {/* ── 3. PEDIDO ── */}
      <section id="pedido" className="scroll-mt-16 border-t border-[#3a2e4f]/20">
        <PedidoSection settings={settings} />
      </section>
    </>
  )
}

/* ════════════════════════════════════════
   SECTION 1 — Hero
   ════════════════════════════════════════ */
function HeroSection({
  whatsappUrl,
}: {
  whatsappUrl?: string
}) {
  return (
    <div className="min-h-[calc(100vh-4rem-40px)] flex items-center px-4 sm:px-6">
      <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center py-16">

        <div className="space-y-7">
          <h1 className="text-5xl sm:text-6xl font-black text-stone-100 leading-[1.05] tracking-tight">
            <span className="text-amber-400">Alta</span>{' '}
            <span className="text-yellow-400">GULA</span>{' '}
            <span className="text-stone-100">Delivery</span>
          </h1>

          <p className="text-stone-400 text-lg leading-relaxed max-w-md">
            Golosinas, bebidas, snacks y mucho más.<br />
            Pedí por WhatsApp y recibís en minutos.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="#productos"
              onClick={scrollTo('productos')}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300
                text-[#14101c] font-black px-7 py-3 rounded-full uppercase tracking-widest
                text-sm transition-all hover:shadow-lg hover:shadow-amber-400/30 active:scale-95"
            >
              Ver productos <ArrowRight size={17} />
            </a>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border-2 border-amber-400/30
                  hover:border-amber-400 text-amber-300 hover:text-amber-200
                  font-black px-7 py-3 rounded-full uppercase tracking-widest
                  text-sm transition-all"
              >
                <MessageCircle size={17} /> Contactar
              </a>
            ) : null}
          </div>
        </div>

        {/* Decorative logo */}
        <div className="hidden md:flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-amber-400/10 blur-3xl scale-150 pointer-events-none" />
            <div className="relative w-72 h-72 rounded-full border border-[#3a2e4f]/30 bg-[#1d1729] flex items-center justify-center">
              <div className="w-52 h-52 rounded-full border border-[#3a2e4f]/30 bg-[#261d36] flex items-center justify-center">
                <div className="text-center leading-none">
                  <div className="text-7xl font-black tracking-tighter">
                    <span className="text-amber-400">A</span>
                    <span className="text-yellow-400">G</span>
                  </div>
                  <div className="text-base font-black text-stone-100 uppercase tracking-[0.25em] mt-3">
                    Delivery
                  </div>
                </div>
              </div>
            </div>
            {/* Top */}
            <span className="absolute -top-8 right-8 text-5xl float-b select-none" style={{ '--dur': '2.8s', animationDelay: '0s' } as React.CSSProperties}>🍭</span>
            <span className="absolute -top-3 left-12 text-2xl float-e select-none" style={{ '--dur': '3.1s', animationDelay: '0.5s' } as React.CSSProperties}>🍬</span>

            {/* Right */}
            <span className="absolute top-1/4 -right-10 text-4xl float-a select-none" style={{ '--dur': '2.4s', animationDelay: '0.8s' } as React.CSSProperties}>🥤</span>
            <span className="absolute top-2/3 -right-4 text-xl float-d select-none"  style={{ '--dur': '3.4s', animationDelay: '1.2s' } as React.CSSProperties}>🧃</span>

            {/* Bottom */}
            <span className="absolute -bottom-8 left-6 text-4xl float-c select-none" style={{ '--dur': '3s',   animationDelay: '0.3s' } as React.CSSProperties}>🍫</span>
            <span className="absolute -bottom-4 right-6 text-2xl float-b select-none" style={{ '--dur': '2.6s', animationDelay: '1s'   } as React.CSSProperties}>🍩</span>
            <span className="absolute -bottom-2 right-24 text-xl float-e select-none" style={{ '--dur': '3.2s', animationDelay: '0.7s' } as React.CSSProperties}>🍪</span>

            {/* Left */}
            <span className="absolute top-1/2 -left-10 -translate-y-1/2 text-4xl float-d select-none" style={{ '--dur': '2.9s', animationDelay: '0.4s' } as React.CSSProperties}>🍿</span>
            <span className="absolute top-1/4 -left-5 text-xl float-a select-none" style={{ '--dur': '3.3s', animationDelay: '0.9s' } as React.CSSProperties}>🍦</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   SECTION 2 — Catálogo
   ════════════════════════════════════════ */
function CatalogSection() {
  const [search, setSearch]     = useState('')
  const [selectedCat, setSelCat] = useState<string | null>(null)

  const { data: categories = [], isLoading: lCats } = useCategories()
  const { data: allItems   = [], isLoading: lItems } = useCatalogItems()
  const loading = lCats || lItems

  const filtered = search
    ? allItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : allItems

  const rows = categories
    .map((cat) => ({ category: cat, items: filtered.filter((i) => i.category_id === cat.id) }))
    .filter(({ items }) => items.length > 0)

  const knownIds = new Set(categories.map((c) => c.id))
  const orphaned = filtered.filter((i) => !i.category_id || !knownIds.has(i.category_id))

  const displayed = selectedCat
    ? rows.filter(({ category }) => category.id === selectedCat)
    : rows

  const isEmpty = displayed.length === 0 && orphaned.length === 0

  return (
    <div className="px-4 sm:px-6 py-12">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h2 className="text-4xl font-black text-stone-100 uppercase tracking-tight">
            Nuestros <span className="text-amber-400">productos</span>
          </h2>
          <p className="text-stone-600 text-sm mt-1">Golosinas, bebidas, snacks y combos. Todo en un solo lugar.</p>
        </div>

        {/* Search */}
        <div className="relative mb-7">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelCat(null) }}
            placeholder="Buscar productos o combos..."
            className="w-full bg-[#1d1729] border border-[#3a2e4f]/25 rounded-xl
              pl-11 pr-11 py-3 text-stone-100 placeholder-stone-700
              focus:outline-none focus:border-amber-400/50 font-medium text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters */}
        {!loading && categories.length > 0 && (
          <div className="mb-9">
            <CategoryFilter
              categories={categories}
              selected={selectedCat}
              onChange={(id) => { setSelCat(id); setSearch('') }}
            />
          </div>
        )}

        {/* Skeletons */}
        {loading && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-4 w-28 bg-stone-800/80 rounded animate-pulse" />
                  <div className="flex-1 h-px bg-[#3a2e4f]/20" />
                </div>
                <div className="flex gap-4">
                  {Array.from({ length: 5 }).map((_, j) => <ProductCardSkeleton key={j} />)}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Content */}
        {!loading && (
          <>
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-stone-600">
                <span className="text-6xl select-none">🔍</span>
                <p className="font-black text-lg text-stone-400">Ningún producto coincide</p>
                <button
                  onClick={() => { setSearch(''); setSelCat(null) }}
                  className="text-amber-300 hover:text-amber-200 font-bold text-sm underline underline-offset-4 transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <>
                {displayed.map(({ category, items }) => (
                  <CategoryRow key={category.id} categoryName={category.name} items={items} />
                ))}
                {orphaned.length > 0 && !selectedCat && (
                  <CategoryRow categoryName="Otros" items={orphaned} />
                )}
              </>
            )}
          </>
        )}

        {/* CTA to pedido */}
        {!loading && !isEmpty && (
          <div className="mt-6 flex justify-center">
            <a
              href="#pedido"
              onClick={scrollTo('pedido')}
              className="flex items-center gap-2 bg-amber-400/10 hover:bg-amber-400/20
                border border-amber-400/25 text-amber-300 font-black px-6 py-2.5
                rounded-full text-sm uppercase tracking-widest transition-all"
            >
              Ir a mi pedido ↓
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   SECTION 3 — Pedido (carrito + formulario)
   ════════════════════════════════════════ */
type EnvioType = 'delivery' | 'retiro'
type PagoType  = 'efectivo' | 'transferencia'

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const generateRef = () =>
  Array.from({ length: 4 }, () => REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)]).join('')


function PedidoSection({ settings }: { settings: ReturnType<typeof useSettings>['data'] }) {
  const { items, updateQuantity, removeItem, clearCart, totalPrice } = useCart()

  const [nombre,     setNombre]     = useState('')
  const [envio,      setEnvio]      = useState<EnvioType>('delivery')
  const [direccion,  setDireccion]  = useState('')
  const [comentario, setComentario] = useState('')
  const [pago,       setPago]       = useState<PagoType>('efectivo')
  const [sent,       setSent]       = useState(false)

  const deliveryCost  = parseFloat(settings?.delivery_cost ?? '') || 0
  const minOrder      = parseFloat(settings?.min_order ?? '') || 0
  const waNumber      = settings?.whatsapp_number ?? ''
  const orderMessage  = settings?.order_message ?? ''

  const shippingCost = envio === 'delivery' ? deliveryCost : 0
  const total        = totalPrice + shippingCost
  const belowMin     = envio === 'delivery' && minOrder > 0 && totalPrice < minOrder

  const canSubmit =
    items.length > 0 &&
    nombre.trim() !== '' &&
    (envio === 'retiro' || direccion.trim() !== '') &&
    !belowMin &&
    waNumber !== ''

  const buildWaMessage = (reference: string | null): string => {
    if (!items.length) return ''
    // Generated inside the function: prevents bundler constant-folding from
    // inlining emoji/special-char literals that can be corrupted by file encoding.
    const ic = String.fromCodePoint
    const vs = ic(0xFE0F) // variation selector-16: forces emoji presentation
    const EM = {
      bag:    ic(0x1F6CD) + vs,
      person: ic(0x1F464) + vs,
      truck:  ic(0x1F69A) + vs,
      card:   ic(0x1F4B3) + vs,
      pkg:    ic(0x1F4E6) + vs,
      money:  ic(0x1F4B0) + vs,
      bubble: ic(0x1F4AC) + vs,
      dot:    ic(0x00B7),        // middle dot  ·
      bullet: ic(0x2022),        // bullet      •
      dash:   ic(0x2500),        // box dash    ─
    }
    const lines = items.map((item) => {
      const sub = fmt(item.price * item.quantity)
      return item.type === 'combo' && item.components
        ? `${EM.bullet} ${item.quantity}x ${item.name.toUpperCase()} [contiene: ${item.components}] -> $${sub}`
        : `${EM.bullet} ${item.quantity}x ${item.name.toUpperCase()} -> $${sub}`
    })
    const sep = EM.dash.repeat(17)
    const envioLine    = envio === 'delivery'
      ? `${EM.truck} Delivery - ${direccion}`
      : `${EM.truck} Retiro en local`
    const envioSummary = envio === 'retiro'
      ? `${EM.pkg} Retiro en local: gratis`
      : deliveryCost > 0
        ? `${EM.pkg} Envio: $${fmt(deliveryCost)}`
        : `${EM.pkg} Envio: a confirmar`
    const header = reference
      ? `${EM.bag} *Pedido*  ${EM.dot}  Ref #${reference}`
      : `${EM.bag} *Pedido*`
    return [
      ...(orderMessage.trim() ? [orderMessage.trim(), ''] : []),
      header, '',
      `${EM.person} ${nombre}`, envioLine,
      `${EM.card} ${pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}`, '',
      sep, ...lines, sep,
      envioSummary, `${EM.money} TOTAL: $${fmt(total)}`, '',
      `${EM.bubble} ${comentario.trim() || 'Sin comentarios'}`,
    ].join('\n')
  }

  const handleSubmit = () => {
    if (!canSubmit) return

    // Snapshot values NOW, before state resets
    const reference    = generateRef()
    const snapNombre   = nombre.trim()
    const snapEnvio    = envio
    const snapDireccion= direccion.trim()
    const snapComentario = comentario.trim()
    const snapPago     = pago
    const snapItems    = [...items]
    const snapSubtotal = totalPrice
    const snapShipping = shippingCost
    const snapTotal    = total

    // 1. Open WhatsApp SYNCHRONOUSLY from the user gesture (prevents popup blocker)
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(buildWaMessage(reference))}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')

    // 2. Reset UI immediately
    clearCart()
    setNombre('')
    setDireccion('')
    setComentario('')
    setSent(true)

    // 3. Save to DB asynchronously — fire and forget, never blocks the sale
    void (async () => {
      try {
        const { error } = await supabase.rpc('create_order_with_items', {
          p_reference:      reference,
          p_customer_name:  snapNombre,
          p_delivery_type:  snapEnvio === 'delivery' ? 'delivery' : 'pickup',
          p_address:        snapEnvio === 'delivery' ? snapDireccion : null,
          p_comment:        snapComentario || null,
          p_payment_method: snapPago,
          p_subtotal:       snapSubtotal,
          p_delivery_cost:  snapShipping,
          p_total:          snapTotal,
          p_items:          snapItems.map((item) => ({
            product_id: item.type === 'product' ? item.id : null,
            combo_id:   item.type === 'combo'   ? item.id : null,
            item_name:  item.name,
            unit_price: item.price,
            quantity:   item.quantity,
            line_total: item.price * item.quantity,
          })),
        })
        if (error) toast.error('No se pudo registrar el pedido en el sistema.')
      } catch {
        toast.error('No se pudo registrar el pedido en el sistema.')
      }
    })()
  }

  return (
    <div className="px-4 sm:px-6 py-12">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h2 className="text-4xl font-black text-stone-100 uppercase tracking-tight">
            Tu <span className="text-amber-400">pedido</span>
          </h2>
          <p className="text-stone-600 text-sm mt-1">
            Revisá los productos, completá tus datos y enviá por WhatsApp.
          </p>
        </div>

        {/* Post-submit confirmation */}
        {sent && items.length === 0 && (
          <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-8
            text-center max-w-lg mx-auto mb-8">
            <p className="text-3xl mb-3">🎉</p>
            <p className="font-black text-green-400 text-lg uppercase tracking-wide">
              ¡Pedido enviado!
            </p>
            <p className="text-stone-400 text-sm mt-2 mb-5">
              Te contactaremos por WhatsApp para confirmar.
            </p>
            <a
              href="#productos"
              onClick={(e) => { setSent(false); scrollTo('productos')(e) }}
              className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300
                text-[#14101c] font-black px-5 py-2.5 rounded-full text-sm uppercase
                tracking-widest transition-colors"
            >
              Hacer otro pedido ↑
            </a>
          </div>
        )}

        {/* Empty cart state */}
        {items.length === 0 && !sent && (
          <div className="flex flex-col items-center gap-5 py-20 text-stone-600">
            <ShoppingBag size={56} strokeWidth={1.5} />
            <div className="text-center">
              <p className="font-black text-stone-300 text-lg mb-1">Tu carrito está vacío</p>
              <p className="text-sm">Explorá el catálogo y agregá lo que quieras.</p>
            </div>
            <a
              href="#productos"
              onClick={scrollTo('productos')}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300
                text-[#14101c] font-black px-6 py-3 rounded-full text-sm uppercase
                tracking-widest transition-colors"
            >
              Ver productos ↑
            </a>
          </div>
        )}

        {/* Main layout: cart + form */}
        {items.length > 0 && (
          <div className="grid lg:grid-cols-[1fr_420px] gap-8 items-start">

            {/* ── Left: editable cart ── */}
            <div className="space-y-3">

              {/* Items */}
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onInc={() => updateQuantity(item.id, 1)}
                  onDec={() => updateQuantity(item.id, -1)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}

              {/* Add more */}
              <a
                href="#productos"
                onClick={scrollTo('productos')}
                className="flex items-center gap-2 text-amber-300 hover:text-amber-200
                  font-bold text-sm transition-colors py-1"
              >
                <Plus size={15} />
                Agregar más productos ↑
              </a>

              {/* Totals */}
              <div className="bg-[#1d1729] border border-[#3a2e4f]/20 rounded-2xl p-5 mt-2 space-y-2">
                <div className="flex justify-between text-sm text-stone-400">
                  <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} productos)</span>
                  <span className="font-bold">${fmt(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm text-stone-400">
                  <span>Envío</span>
                  <span className="font-bold">
                    {envio === 'retiro' ? 'Gratis'
                      : deliveryCost > 0 ? `$${fmt(deliveryCost)}`
                      : 'A confirmar'}
                  </span>
                </div>
                <div className="flex justify-between font-black text-amber-300 text-2xl
                  border-t border-[#3a2e4f]/30 pt-2 mt-1">
                  <span>TOTAL</span>
                  <span>${fmt(total)}</span>
                </div>

                {/* Min order warning */}
                {belowMin && (
                  <div className="flex items-start gap-2 bg-yellow-500/10 border
                    border-yellow-500/25 rounded-xl p-3 mt-1">
                    <AlertTriangle size={15} className="text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-300 leading-snug">
                      El pedido mínimo es{' '}
                      <span className="font-black">${fmt(minOrder)}</span>.
                      Te faltan{' '}
                      <span className="font-black">${fmt(minOrder - totalPrice)}</span> en productos.{' '}
                      <a
                        href="#productos"
                        onClick={scrollTo('productos')}
                        className="underline hover:text-yellow-200"
                      >
                        ¿Agregás algo más?
                      </a>
                    </p>
                  </div>
                )}

                <button
                  onClick={clearCart}
                  className="text-stone-700 hover:text-red-400 font-bold text-xs
                    uppercase tracking-wider transition-colors pt-1 block"
                >
                  Vaciar carrito
                </button>
              </div>
            </div>

            {/* ── Right: form ── */}
            <div className="bg-[#1d1729] border border-[#3a2e4f]/20 rounded-2xl p-5 space-y-5 sticky top-24">

              <Field label="Nombre y Apellido *">
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Juan Pérez"
                  className={inp}
                />
              </Field>

              <Field label="Tipo de entrega *">
                <div className="grid grid-cols-2 gap-3">
                  {(['delivery', 'retiro'] as EnvioType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEnvio(t)}
                      className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest
                        border-2 transition-all ${
                        envio === t
                          ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                          : 'bg-[#261d36] border-[#3a2e4f]/30 text-stone-500 hover:border-amber-600/50'
                      }`}
                    >
                      {t === 'delivery' ? '🚚 Delivery' : '🏠 Retiro'}
                    </button>
                  ))}
                </div>
              </Field>

              {envio === 'delivery' && (
                <Field label="Dirección *">
                  <input
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Calle 123, Piso 2, Dpto B"
                    className={inp}
                  />
                </Field>
              )}

              <Field label="Comentarios">
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Sin cebolla, picante, aclaraciones..."
                  rows={2}
                  className={`${inp} resize-none`}
                />
              </Field>

              <Field label="Método de pago">
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { v: 'efectivo',      l: '💵 Efectivo' },
                    { v: 'transferencia', l: '📱 Transferencia' },
                  ] as { v: PagoType; l: string }[]).map(({ v, l }) => (
                    <label
                      key={v}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2
                        cursor-pointer transition-all ${
                        pago === v
                          ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                          : 'bg-[#261d36] border-[#3a2e4f]/30 text-stone-500 hover:border-amber-600/50'
                      }`}
                    >
                      <input type="radio" name="pago" value={v} checked={pago === v}
                        onChange={() => setPago(v)} className="sr-only" />
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center
                        justify-center shrink-0 ${pago === v ? 'border-amber-400' : 'border-stone-700'}`}>
                        {pago === v && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      </div>
                      <span className="font-black text-xs">{l}</span>
                    </label>
                  ))}
                </div>
              </Field>

              {!waNumber && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl p-3">
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">
                    El número de WhatsApp no está configurado todavía.
                  </p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`w-full flex items-center justify-center gap-2 font-black py-4
                  rounded-xl text-sm uppercase tracking-widest transition-all ${
                  canSubmit
                    ? 'bg-green-700 hover:bg-green-600 text-white hover:shadow-lg hover:shadow-green-900/40 active:scale-[0.98]'
                    : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                }`}
              >
                <MessageCircle size={18} />
                Enviar pedido por WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Cart item row ── */
function CartItemRow({
  item, onInc, onDec, onRemove,
}: {
  item: CartItem
  onInc: () => void
  onDec: () => void
  onRemove: () => void
}) {
  return (
    <div className="bg-[#1d1729] border border-[#3a2e4f]/20 rounded-2xl p-4 flex gap-4
      hover:border-[#3a2e4f]/40 transition-colors">

      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-xl bg-[#261d36] shrink-0 overflow-hidden">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🍔</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-stone-100 text-sm truncate">{item.name}</p>
        {item.components && (
          <p className="text-[11px] text-stone-600 truncate mt-0.5">{item.components}</p>
        )}

        <div className="flex items-center justify-between mt-2.5">
          {/* Qty controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onDec}
              className="w-7 h-7 rounded-lg bg-[#261d36] flex items-center justify-center
                text-stone-400 hover:bg-amber-400 hover:text-white transition-colors"
            >
              <Minus size={13} />
            </button>
            <span className="font-black text-stone-100 w-5 text-center">{item.quantity}</span>
            <button
              onClick={onInc}
              className="w-7 h-7 rounded-lg bg-[#261d36] flex items-center justify-center
                text-stone-400 hover:bg-amber-400 hover:text-white transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-black text-amber-300 text-base">
              ${fmt(item.price * item.quantity)}
            </span>
            <button
              onClick={onRemove}
              className="text-stone-700 hover:text-red-400 transition-colors"
              aria-label={`Quitar ${item.name}`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Form field wrapper ── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-black text-stone-500 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  )
}

const inp =
  'w-full bg-[#261d36] border border-[#3a2e4f]/25 rounded-xl px-4 py-2.5 ' +
  'text-stone-100 placeholder-stone-700 focus:outline-none focus:border-amber-400/50 text-sm font-medium'
