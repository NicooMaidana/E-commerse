import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, MessageCircle, ShoppingBag, ArrowLeft } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useCart } from '../context/CartContext'
import { useSettings } from '../hooks/useSettings'

type EnvioType = 'delivery' | 'retiro'
type PagoType  = 'efectivo' | 'transferencia'

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 0 })

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart()
  const { data: settings }              = useSettings()
  const navigate                        = useNavigate()

  const [nombre,    setNombre]    = useState('')
  const [envio,     setEnvio]     = useState<EnvioType>('delivery')
  const [direccion, setDireccion] = useState('')
  const [comentario,setComentario]= useState('')
  const [pago,      setPago]      = useState<PagoType>('efectivo')

  const deliveryCost  = parseFloat(settings?.delivery_cost ?? '') || 0
  const minOrder      = parseFloat(settings?.min_order ?? '') || 0
  const waNumber      = settings?.whatsapp_number ?? ''
  const orderMessage  = settings?.order_message ?? ''

  const shippingCost = envio === 'delivery' ? deliveryCost : 0
  const total        = totalPrice + shippingCost
  const belowMin     = envio === 'delivery' && minOrder > 0 && totalPrice < minOrder

  const canSubmit =
    nombre.trim() !== '' &&
    (envio === 'retiro' || direccion.trim() !== '') &&
    items.length > 0 &&
    !belowMin &&
    waNumber !== ''

  const waMessage = useMemo(() => {
    const itemLines = items.map((item) => {
      const subtotal = fmt(item.price * item.quantity)
      return item.type === 'combo' && item.components
        ? `• ${item.quantity}x ${item.name.toUpperCase()} [contiene: ${item.components}] → $${subtotal}`
        : `• ${item.quantity}x ${item.name.toUpperCase()} → $${subtotal}`
    })

    const envioLine    = envio === 'delivery' ? `🚚 Delivery — ${direccion}` : '🚚 Retiro en local'
    const envioSummary =
      envio === 'retiro'      ? '📦 Retiro en local: gratis'
      : deliveryCost > 0      ? `📦 Envío: $${fmt(deliveryCost)}`
      : '📦 Envío: a confirmar'

    return [
      ...(orderMessage.trim() ? [orderMessage.trim(), ''] : []),
      `🛍️ *Pedido*`,
      '',
      `👤 ${nombre}`,
      envioLine,
      `💳 ${pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}`,
      '',
      '─────────────────',
      ...itemLines,
      '─────────────────',
      envioSummary,
      `💰 TOTAL: $${fmt(total)}`,
      '',
      `💬 ${comentario.trim() || 'Sin comentarios'}`,
    ].join('\n')
  }, [items, nombre, envio, direccion, pago, comentario, deliveryCost, total, orderMessage])

  const handleSubmit = () => {
    if (!canSubmit) return
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    clearCart()
    navigate('/')
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-stone-600 px-4">
        <Helmet><title>Checkout | Alta GULA Delivery</title></Helmet>
        <ShoppingBag size={64} strokeWidth={1.5} />
        <div className="text-center">
          <p className="font-black text-xl text-stone-300 mb-1">Tu carrito está vacío</p>
          <p className="text-sm">Agregá productos antes de continuar.</p>
        </div>
        <button
          onClick={() => navigate('/productos')}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300
            text-[#14101c] font-black px-6 py-3 rounded-full text-sm uppercase
            tracking-widest transition-colors"
        >
          Ver productos
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8">
      <Helmet><title>Completar pedido | Alta GULA Delivery</title></Helmet>
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-stone-500 hover:text-amber-300 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-4xl font-black text-stone-100 uppercase tracking-tight">
            Completar <span className="text-amber-400">pedido</span>
          </h1>
        </div>

        {/* On mobile stacks: form → summary. On lg: two-col grid */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">

          {/* ── Form ── */}
          <div className="space-y-5">
            <FormCard title="Tus datos">
              <Field label="Nombre y Apellido *">
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Juan Pérez"
                  className={inputClass}
                />
              </Field>

              <Field label="Tipo de entrega *">
                <div className="grid grid-cols-2 gap-3">
                  {(['delivery', 'retiro'] as EnvioType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEnvio(t)}
                      className={`py-3 rounded-xl font-black text-xs uppercase
                        tracking-widest border-2 transition-all ${
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
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Calle 123, Piso 2, Dpto B"
                    className={inputClass}
                  />
                </Field>
              )}

              <Field label="Comentarios">
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Sin cebolla, picante, aclaraciones de entrega..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </FormCard>

            <FormCard title="Método de pago">
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { value: 'efectivo',      label: '💵 Efectivo' },
                    { value: 'transferencia', label: '📱 Transferencia' },
                  ] as { value: PagoType; label: string }[]
                ).map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2
                      cursor-pointer transition-all ${
                      pago === value
                        ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                        : 'bg-[#261d36] border-[#3a2e4f]/30 text-stone-500 hover:border-amber-600/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pago"
                      value={value}
                      checked={pago === value}
                      onChange={() => setPago(value)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center
                        justify-center shrink-0 transition-colors ${
                        pago === value ? 'border-amber-400' : 'border-stone-700'
                      }`}
                    >
                      {pago === value && (
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                      )}
                    </div>
                    <span className="font-black text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </FormCard>
          </div>

          {/* ── Summary ── */}
          <div className="sticky top-24">
            <FormCard title="Resumen del pedido">
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-stone-200 leading-tight truncate">
                        {item.quantity}× {item.name}
                      </p>
                      {item.components && (
                        <p className="text-[11px] text-stone-600 truncate">{item.components}</p>
                      )}
                    </div>
                    <span className="text-sm font-black text-amber-300 shrink-0">
                      ${fmt(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#3a2e4f]/30 pt-3 space-y-1.5 mt-1">
                <div className="flex justify-between text-sm text-stone-400">
                  <span>Subtotal</span>
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
                <div className="flex justify-between font-black text-amber-300 text-xl border-t border-[#3a2e4f]/30 pt-2 mt-1">
                  <span>TOTAL</span>
                  <span>${fmt(total)}</span>
                </div>
              </div>

              {belowMin && (
                <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-3 mt-1">
                  <AlertTriangle size={15} className="text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-300 leading-snug">
                    El pedido mínimo es{' '}
                    <span className="font-black">${fmt(minOrder)}</span>.
                    Te faltan <span className="font-black">${fmt(minOrder - totalPrice)}</span>.
                  </p>
                </div>
              )}

              {!waNumber && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl p-3 mt-1">
                  <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-snug">
                    El número de WhatsApp no está configurado todavía.
                  </p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`w-full flex items-center justify-center gap-2 font-black
                  py-3.5 rounded-xl text-sm uppercase tracking-widest transition-all mt-1 ${
                  canSubmit
                    ? 'bg-green-700 hover:bg-green-600 text-white hover:shadow-lg hover:shadow-green-900/40 active:scale-[0.98]'
                    : 'bg-stone-800 text-stone-600 cursor-not-allowed'
                }`}
              >
                <MessageCircle size={17} />
                Enviar por WhatsApp
              </button>
            </FormCard>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputClass =
  'w-full bg-[#261d36] border border-[#3a2e4f]/25 rounded-xl ' +
  'px-4 py-2.5 text-stone-100 placeholder-stone-700 ' +
  'focus:outline-none focus:border-amber-400/50 text-sm font-medium'

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1d1729] border border-[#3a2e4f]/20 rounded-2xl p-5 space-y-4">
      <h2 className="text-xs font-black text-amber-300 uppercase tracking-widest">{title}</h2>
      {children}
    </div>
  )
}

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
