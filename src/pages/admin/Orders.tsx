import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Search, MapPin, CreditCard, MessageSquare,
  AlertTriangle, X, Loader2, Package2,
  Minus, Plus, Pencil, ClipboardList,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../hooks/useSettings'
import type { Order, OrderItem } from '../../types'

// ── Types ──────────────────────────────────────────────────────────────────────

type OrderStatus = 'pending' | 'confirmed' | 'cancelled'

interface OrderWithItems extends Order {
  order_items: OrderItem[]
}

interface ComboComponent {
  combo_id: string
  quantity: number
  products: { id: string; name: string; stock: number } | null
}

interface StockLine {
  name: string
  qty: number
  currentStock: number
}

interface EditItem {
  key: string
  product_id: string | null
  combo_id: string | null
  item_name: string
  unit_price: number
  quantity: number
}

interface AdminCatalogItem {
  id: string
  type: 'product' | 'combo'
  name: string
  price: number
  stock?: number
}

// Shared query key so Dashboard/Sidebar pick up invalidations automatically
export const PENDING_COUNT_KEY = ['admin', 'orders', 'count', 'pending'] as const

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 0 })

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const generateRef = () =>
  Array.from({ length: 4 }, () => REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)]).join('')

// ── StatusBadge ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = {
    pending:   { label: 'Pendiente',  cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
    confirmed: { label: 'Confirmado', cls: 'bg-green-500/15  text-green-400  border-green-500/25'  },
    cancelled: { label: 'Cancelado',  cls: 'bg-stone-500/15  text-stone-500  border-stone-500/25'  },
  }[status]
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ── ModalOverlay ───────────────────────────────────────────────────────────────

function ModalOverlay({
  children, onClose, wide = false,
}: {
  children: React.ReactNode
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-[#1a1008] border border-orange-900/25 rounded-2xl w-full
        max-h-[90vh] overflow-y-auto shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
        {children}
      </div>
    </div>
  )
}

// ── ConfirmModal ───────────────────────────────────────────────────────────────

function ConfirmModal({
  order, isPending, onConfirm, onClose,
}: {
  order: OrderWithItems
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const productIds = [...new Set(
    order.order_items.filter(i => i.product_id).map(i => i.product_id!)
  )]
  const comboIds = [...new Set(
    order.order_items.filter(i => i.combo_id).map(i => i.combo_id!)
  )]

  const { data: productStocks = [], isLoading: loadingProducts } = useQuery<
    { id: string; name: string; stock: number }[]
  >({
    queryKey: ['admin', 'modal_stocks', productIds.sort().join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products').select('id, name, stock').in('id', productIds)
      if (error) throw error
      return data ?? []
    },
    enabled: productIds.length > 0,
  })

  const { data: comboComponents = [], isLoading: loadingCombos } = useQuery<ComboComponent[]>({
    queryKey: ['admin', 'modal_combos', comboIds.sort().join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('combo_items')
        .select('combo_id, quantity, products(id, name, stock)')
        .in('combo_id', comboIds)
      if (error) throw error
      return (data ?? []) as unknown as ComboComponent[]
    },
    enabled: comboIds.length > 0,
  })

  const loading =
    (productIds.length > 0 && loadingProducts) ||
    (comboIds.length > 0 && loadingCombos)

  // Aggregate deductions by product id
  const productMap = new Map<string, StockLine>()
  if (!loading) {
    for (const item of order.order_items) {
      if (item.product_id) {
        const prod = productStocks.find(p => p.id === item.product_id)
        const existing = productMap.get(item.product_id)
        if (existing) {
          existing.qty += item.quantity
        } else {
          productMap.set(item.product_id, {
            name: item.item_name,
            qty: item.quantity,
            currentStock: prod?.stock ?? 0,
          })
        }
      } else if (item.combo_id) {
        for (const comp of comboComponents.filter(c => c.combo_id === item.combo_id)) {
          if (!comp.products) continue
          const deduction = comp.quantity * item.quantity
          const key = comp.products.id
          const existing = productMap.get(key)
          if (existing) {
            existing.qty += deduction
          } else {
            productMap.set(key, {
              name: comp.products.name,
              qty: deduction,
              currentStock: comp.products.stock,
            })
          }
        }
      }
    }
  }
  const stockLines = Array.from(productMap.values())
  const hasNegative = stockLines.some(l => l.currentStock - l.qty < 0)

  return (
    <ModalOverlay onClose={onClose}>
      <div className="px-6 pt-6 pb-2 flex items-start justify-between">
        <div>
          <h2 className="font-black text-stone-100 text-lg uppercase tracking-tight">
            Confirmar venta
          </h2>
          <p className="text-stone-500 text-xs mt-0.5">
            Ref #{order.reference} · {order.customer_name}
          </p>
        </div>
        <button onClick={onClose} className="text-stone-600 hover:text-stone-400 mt-0.5">
          <X size={18} />
        </button>
      </div>

      <div className="px-6 pb-6 space-y-4 mt-4">
        <p className="text-stone-400 text-sm">
          Stock que se descontará al confirmar:
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-orange-500" />
          </div>
        ) : stockLines.length === 0 ? (
          <p className="text-stone-600 text-sm text-center py-4 italic">
            Sin productos con stock para descontar.
          </p>
        ) : (
          <div className="bg-[#120c06] border border-orange-900/15 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-orange-900/10">
                  {['Producto', 'Descuento', 'Stock actual', 'Resultante'].map(h => (
                    <th key={h} className={`py-2.5 px-4 text-[10px] font-black text-stone-600 uppercase tracking-wider
                      ${h === 'Producto' ? 'text-left' : 'text-right'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockLines.map((line, i) => {
                  const result = line.currentStock - line.qty
                  const neg = result < 0
                  return (
                    <tr key={i} className="border-b border-orange-900/10 last:border-0">
                      <td className="px-4 py-2.5 font-bold text-stone-200">{line.name}</td>
                      <td className="px-4 py-2.5 text-right text-red-400 font-bold">-{line.qty}</td>
                      <td className="px-4 py-2.5 text-right text-stone-500">{line.currentStock}</td>
                      <td className={`px-4 py-2.5 text-right font-black ${neg ? 'text-red-400' : 'text-green-400'}`}>
                        {result}{neg && ' ⚠'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && hasNegative && (
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
            <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300">
              Algunos productos quedarán con stock negativo. Podés confirmar igual — el admin lo
              resuelve reponiendo stock.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl border border-orange-900/30 text-stone-400 font-black
              text-sm uppercase tracking-widest hover:border-orange-700/50 hover:text-stone-200
              transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending || loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-700
              hover:bg-green-600 text-white font-black text-sm uppercase tracking-widest
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending
              ? <Loader2 size={15} className="animate-spin" />
              : <CheckCircle2 size={15} />}
            {isPending ? 'Confirmando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── CancelModal ────────────────────────────────────────────────────────────────

function CancelModal({
  order, isPending, onConfirm, onClose,
}: {
  order: OrderWithItems
  isPending: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="px-6 pt-6 pb-2 flex items-start justify-between">
        <div>
          <h2 className="font-black text-stone-100 text-lg uppercase tracking-tight">
            Cancelar pedido
          </h2>
          <p className="text-stone-500 text-xs mt-0.5">
            Ref #{order.reference} · {order.customer_name}
          </p>
        </div>
        <button onClick={onClose} className="text-stone-600 hover:text-stone-400 mt-0.5">
          <X size={18} />
        </button>
      </div>

      <div className="px-6 pb-6 space-y-4 mt-4">
        <p className="text-stone-400 text-sm">
          ¿Cancelar este pedido? El stock <strong className="text-stone-300">no será modificado</strong>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl border border-orange-900/30 text-stone-400 font-black
              text-sm uppercase tracking-widest hover:border-orange-700/50 hover:text-stone-200
              transition-all disabled:opacity-50"
          >
            No, volver
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              bg-red-900/40 hover:bg-red-900/60 border border-red-800/40 hover:border-red-700/50
              text-red-400 font-black text-sm uppercase tracking-widest
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending
              ? <Loader2 size={15} className="animate-spin" />
              : <XCircle size={15} />}
            {isPending ? 'Cancelando...' : 'Sí, cancelar'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── CreateManualOrderModal ─────────────────────────────────────────────────────

const inp = 'w-full bg-[#251608] border border-orange-900/25 rounded-xl px-3 py-2.5 ' +
  'text-stone-100 placeholder-stone-700 focus:outline-none focus:border-orange-500/50 text-sm font-medium'

function CreateManualOrderModal({
  onClose, onCreated,
}: {
  onClose: () => void
  onCreated: (reference: string) => void
}) {
  const keyRef = useRef(0)
  const { data: settings } = useSettings()
  const deliveryCost = parseFloat(settings?.delivery_cost ?? '') || 0
  const minOrder     = parseFloat(settings?.min_order ?? '') || 0

  const [nombre,        setNombre]        = useState('')
  const [envio,         setEnvio]         = useState<'delivery' | 'pickup'>('delivery')
  const [direccion,     setDireccion]     = useState('')
  const [comentario,    setComentario]    = useState('')
  const [pago,          setPago]          = useState<'efectivo' | 'transferencia'>('efectivo')
  const [items,         setItems]         = useState<EditItem[]>([])
  const [catalogSearch, setCatalogSearch] = useState('')

  const { data: adminCatalog = [] } = useQuery<AdminCatalogItem[]>({
    queryKey: ['admin', 'catalog_all'],
    queryFn: async () => {
      const [pr, co] = await Promise.all([
        supabase.from('products').select('id, name, price, stock').eq('visible', true).order('name'),
        supabase.from('combos').select('id, name, price').eq('visible', true).order('name'),
      ])
      return [
        ...(pr.data ?? []).map(p => ({ id: p.id, type: 'product' as const, name: p.name, price: p.price, stock: p.stock as number })),
        ...(co.data ?? []).map(c => ({ id: c.id, type: 'combo'   as const, name: c.name, price: c.price })),
      ]
    },
  })

  const catalogResults = useMemo(() =>
    catalogSearch.length >= 2
      ? adminCatalog.filter(i => i.name.toLowerCase().includes(catalogSearch.toLowerCase())).slice(0, 8)
      : [],
    [catalogSearch, adminCatalog]
  )

  const subtotal  = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const shipping  = envio === 'delivery' ? deliveryCost : 0
  const total     = subtotal + shipping
  const belowMin  = envio === 'delivery' && minOrder > 0 && subtotal < minOrder

  const addCatalogItem = (item: AdminCatalogItem) => {
    const key = `new-${keyRef.current++}`
    setItems(prev => [...prev, {
      key,
      product_id: item.type === 'product' ? item.id : null,
      combo_id:   item.type === 'combo'   ? item.id : null,
      item_name:  item.name,
      unit_price: item.price,
      quantity:   1,
    }])
    setCatalogSearch('')
  }

  const removeItem = (key: string) => setItems(prev => prev.filter(i => i.key !== key))
  const setQty     = (key: string, qty: number) => {
    if (qty < 1) return
    setItems(prev => prev.map(i => i.key === key ? { ...i, quantity: qty } : i))
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const ref = generateRef()
      const { data: orderId, error: createErr } = await supabase.rpc('create_order_with_items', {
        p_reference:      ref,
        p_customer_name:  nombre.trim(),
        p_delivery_type:  envio,
        p_address:        envio === 'delivery' ? (direccion.trim() || null) : null,
        p_comment:        comentario.trim() || null,
        p_payment_method: pago,
        p_subtotal:       subtotal,
        p_delivery_cost:  shipping,
        p_total:          total,
        p_source:         'manual',
        p_items:          items.map(i => ({
          product_id: i.product_id,
          combo_id:   i.combo_id,
          item_name:  i.item_name,
          unit_price: i.unit_price,
          quantity:   i.quantity,
          line_total: i.unit_price * i.quantity,
        })),
      })
      if (createErr) throw createErr
      const { error: confirmErr } = await supabase.rpc('confirm_order', { p_order_id: orderId as string })
      if (confirmErr) throw confirmErr
      return ref
    },
    onSuccess: (ref) => onCreated(ref),
    onError: (e: Error) => toast.error(e.message || 'Error al crear el pedido'),
  })

  const canSave = items.length > 0 &&
    nombre.trim() !== '' &&
    (envio === 'pickup' || direccion.trim() !== '') &&
    !createMutation.isPending

  return (
    <ModalOverlay onClose={onClose} wide>
      {/* Header */}
      <div className="px-6 pt-6 pb-3 flex items-start justify-between border-b border-orange-900/15">
        <div>
          <h2 className="font-black text-stone-100 text-lg uppercase tracking-tight">Cargar pedido manual</h2>
          <p className="text-stone-500 text-xs mt-0.5">Se crea y confirma al instante — el stock se descuenta al guardar.</p>
        </div>
        <button onClick={onClose} className="text-stone-600 hover:text-stone-400"><X size={18} /></button>
      </div>

      <div className="px-6 pb-6 pt-5 space-y-6">

        {/* ── Datos del cliente ── */}
        <section className="space-y-3">
          <p className="text-[11px] font-black text-stone-500 uppercase tracking-widest">Datos del cliente</p>

          <div>
            <label className="block text-[10px] font-black text-stone-600 uppercase tracking-wider mb-1">Nombre y Apellido *</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} className={inp} placeholder="Juan Pérez" />
          </div>

          <div>
            <label className="block text-[10px] font-black text-stone-600 uppercase tracking-wider mb-2">Tipo de entrega *</label>
            <div className="flex gap-3">
              {([['delivery', 'Delivery'], ['pickup', 'Retiro en local']] as const).map(([v, label]) => (
                <label key={v} className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer
                  transition-all text-sm font-bold select-none ${
                  envio === v
                    ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                    : 'bg-[#2a1608] border-orange-900/30 text-stone-500 hover:border-orange-700/50'
                }`}>
                  <input type="radio" className="sr-only" checked={envio === v} onChange={() => setEnvio(v)} />
                  <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${envio === v ? 'border-orange-500 bg-orange-500/60' : 'border-stone-700'}`} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {envio === 'delivery' && (
            <div>
              <label className="block text-[10px] font-black text-stone-600 uppercase tracking-wider mb-1">Dirección *</label>
              <input value={direccion} onChange={e => setDireccion(e.target.value)} className={inp} placeholder="Calle 123, Barrio" />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-stone-600 uppercase tracking-wider mb-1">Comentario</label>
            <textarea value={comentario} onChange={e => setComentario(e.target.value)}
              rows={2} className={`${inp} resize-none`} placeholder="Sin comentarios" />
          </div>

          <div>
            <label className="block text-[10px] font-black text-stone-600 uppercase tracking-wider mb-2">Método de pago</label>
            <div className="flex gap-3">
              {(['efectivo', 'transferencia'] as const).map(v => (
                <label key={v} className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer
                  transition-all text-sm font-bold select-none ${
                  pago === v
                    ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                    : 'bg-[#2a1608] border-orange-900/30 text-stone-500 hover:border-orange-700/50'
                }`}>
                  <input type="radio" className="sr-only" checked={pago === v} onChange={() => setPago(v)} />
                  <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${pago === v ? 'border-orange-500 bg-orange-500/60' : 'border-stone-700'}`} />
                  {v === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* ── Ítems ── */}
        <section className="space-y-3">
          <p className="text-[11px] font-black text-stone-500 uppercase tracking-widest">Ítems del pedido</p>

          {items.length === 0 ? (
            <p className="text-stone-600 text-sm text-center py-5 italic">
              Sin ítems. Usá el buscador para agregar productos o combos.
            </p>
          ) : (
            <div className="bg-[#120c06] border border-orange-900/15 rounded-xl overflow-hidden">
              {items.map(item => (
                <div key={item.key}
                  className="flex items-center gap-2 px-4 py-3 border-b border-orange-900/10 last:border-0">
                  <span className="flex-1 text-sm font-bold text-stone-200 truncate min-w-0">{item.item_name}</span>
                  <span className="text-xs text-stone-600 shrink-0">${fmt(item.unit_price)}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setQty(item.key, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-[#1a1008] flex items-center justify-center
                        text-stone-400 hover:bg-orange-500/20 hover:text-orange-400 transition-colors">
                      <Minus size={11} />
                    </button>
                    <span className="w-7 text-center font-black text-stone-100 text-sm">{item.quantity}</span>
                    <button onClick={() => setQty(item.key, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-[#1a1008] flex items-center justify-center
                        text-stone-400 hover:bg-orange-500/20 hover:text-orange-400 transition-colors">
                      <Plus size={11} />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-orange-400 shrink-0 w-20 text-right">
                    ${fmt(item.unit_price * item.quantity)}
                  </span>
                  <button onClick={() => removeItem(item.key)}
                    className="text-stone-600 hover:text-red-400 transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Totales en vivo */}
          <div className="space-y-1 px-1">
            <div className="flex justify-between text-sm text-stone-500">
              <span>Subtotal</span>
              <span className="font-bold">${fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-stone-500">
              <span>Envío</span>
              <span className="font-bold">
                {envio === 'pickup' ? 'Gratis'
                  : deliveryCost > 0 ? `$${fmt(deliveryCost)}`
                  : 'A confirmar'}
              </span>
            </div>
            <div className="flex justify-between font-black text-orange-400 text-lg
              border-t border-orange-900/20 pt-2 mt-1">
              <span>Total</span>
              <span>${fmt(total)}</span>
            </div>
          </div>

          {/* Aviso monto mínimo */}
          {belowMin && items.length > 0 && (
            <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
              <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-300">
                El monto mínimo es{' '}
                <span className="font-black">${fmt(minOrder)}</span>.
                Podés cargarlo igual si es una excepción.
              </p>
            </div>
          )}

          {/* Buscador de catálogo */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none" />
            <input
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
              placeholder="Buscar producto o combo para agregar... (min. 2 caracteres)"
              className={`${inp} pl-8`}
            />
            {catalogSearch && (
              <button onClick={() => setCatalogSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400">
                <X size={13} />
              </button>
            )}
          </div>

          {catalogResults.length > 0 && (
            <div className="bg-[#0f0904] border border-orange-900/25 rounded-xl overflow-hidden">
              {catalogResults.map(item => (
                <button key={item.id} type="button" onClick={() => addCatalogItem(item)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm
                    hover:bg-orange-500/10 transition-colors border-b border-orange-900/10 last:border-0 text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] font-black text-stone-700 uppercase shrink-0">
                      {item.type === 'product' ? 'Prod' : 'Combo'}
                    </span>
                    <span className="font-bold text-stone-200 truncate">{item.name}</span>
                    {item.stock !== undefined && (
                      <span className={`text-xs font-black shrink-0 ${
                        item.stock <= 0 ? 'text-red-400' : item.stock <= 5 ? 'text-yellow-400' : 'text-stone-600'
                      }`}>
                        stock: {item.stock}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-orange-400 font-bold">${fmt(item.price)}</span>
                    <Plus size={14} className="text-orange-500" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Acciones ── */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={createMutation.isPending}
            className="flex-1 py-3 rounded-xl border border-orange-900/30 text-stone-400 font-black
              text-sm uppercase tracking-widest hover:border-orange-700/50 hover:text-stone-200
              transition-all disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!canSave}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              bg-orange-600 hover:bg-orange-500 text-white font-black text-sm uppercase
              tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending
              ? <Loader2 size={15} className="animate-spin" />
              : <ClipboardList size={15} />}
            {createMutation.isPending ? 'Guardando...' : 'Crear pedido'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── EditOrderModal ─────────────────────────────────────────────────────────────

function buildConsumptionMap(
  items: { product_id: string | null; combo_id: string | null; quantity: number }[],
  comboComps: ComboComponent[],
): Map<string, number> {
  const m = new Map<string, number>()
  for (const item of items) {
    if (item.product_id) {
      m.set(item.product_id, (m.get(item.product_id) ?? 0) + item.quantity)
    } else if (item.combo_id) {
      for (const cc of comboComps.filter(c => c.combo_id === item.combo_id)) {
        if (!cc.products) continue
        m.set(cc.products.id, (m.get(cc.products.id) ?? 0) + cc.quantity * item.quantity)
      }
    }
  }
  return m
}

function EditOrderModal({
  order, onClose, onSaved,
}: {
  order: OrderWithItems
  onClose: () => void
  onSaved: () => void
}) {
  const isConfirmed = order.status === 'confirmed'
  const keyRef = useRef(0)

  // ── Editable state ──────────────────────────────────────────────────────────

  const [editItems, setEditItems] = useState<EditItem[]>(() =>
    order.order_items.map(i => ({
      key: i.id,
      product_id: i.product_id,
      combo_id:   i.combo_id,
      item_name:  i.item_name,
      unit_price: i.unit_price,
      quantity:   i.quantity,
    }))
  )
  const [nombre,    setNombre]    = useState(order.customer_name)
  const [direccion, setDireccion] = useState(order.address ?? '')
  const [comentario,setComentario]= useState(order.comment ?? '')
  const [pago,      setPago]      = useState(order.payment_method)
  const [catalogSearch, setCatalogSearch] = useState('')

  // ── Admin catalog (all visible items, no stock filter) ──────────────────────

  const { data: adminCatalog = [] } = useQuery<AdminCatalogItem[]>({
    queryKey: ['admin', 'catalog_all'],
    queryFn: async () => {
      const [pr, co] = await Promise.all([
        supabase.from('products').select('id, name, price, stock').eq('visible', true).order('name'),
        supabase.from('combos').select('id, name, price').eq('visible', true).order('name'),
      ])
      return [
        ...(pr.data ?? []).map(p => ({ id: p.id, type: 'product' as const, name: p.name, price: p.price, stock: p.stock as number })),
        ...(co.data ?? []).map(c => ({ id: c.id, type: 'combo'   as const, name: c.name, price: c.price })),
      ]
    },
  })

  const catalogResults = useMemo(() =>
    catalogSearch.length >= 2
      ? adminCatalog.filter(i => i.name.toLowerCase().includes(catalogSearch.toLowerCase())).slice(0, 8)
      : [],
    [catalogSearch, adminCatalog]
  )

  // ── Stock delta data (confirmed orders only) ────────────────────────────────

  const allComboIds = useMemo(() => [...new Set([
    ...order.order_items.filter(i => i.combo_id).map(i => i.combo_id!),
    ...editItems.filter(i => i.combo_id).map(i => i.combo_id!),
  ])], [order.order_items, editItems])

  const allProductIds = useMemo(() => [...new Set([
    ...order.order_items.filter(i => i.product_id).map(i => i.product_id!),
    ...editItems.filter(i => i.product_id).map(i => i.product_id!),
  ])], [order.order_items, editItems])

  const { data: deltaData } = useQuery({
    queryKey: ['admin', 'edit_delta', allComboIds.slice().sort().join(','), allProductIds.slice().sort().join(',')],
    queryFn: async () => {
      const [cc, ps] = await Promise.all([
        allComboIds.length > 0
          ? supabase.from('combo_items').select('combo_id, quantity, products(id, name, stock)').in('combo_id', allComboIds)
          : { data: [] as unknown[], error: null },
        allProductIds.length > 0
          ? supabase.from('products').select('id, name, stock').in('id', allProductIds)
          : { data: [] as unknown[], error: null },
      ])
      return {
        comboComps:    (cc.data ?? []) as unknown as ComboComponent[],
        productStocks: (ps.data ?? []) as { id: string; name: string; stock: number }[],
      }
    },
    enabled: isConfirmed,
    staleTime: 8_000,
  })

  // ── Compute stock delta lines ───────────────────────────────────────────────

  const stockDeltaLines = useMemo(() => {
    if (!isConfirmed || !deltaData) return []
    const { comboComps, productStocks } = deltaData

    const prodInfo = new Map<string, { name: string; stock: number }>()
    for (const p of productStocks) prodInfo.set(p.id, { name: p.name, stock: p.stock })
    for (const c of comboComps) {
      if (c.products) prodInfo.set(c.products.id, { name: c.products.name, stock: c.products.stock })
    }

    const oldMap = buildConsumptionMap(order.order_items, comboComps)
    const newMap = buildConsumptionMap(editItems, comboComps)
    const allIds = new Set([...oldMap.keys(), ...newMap.keys()])

    const lines: { name: string; delta: number; stock: number }[] = []
    for (const pid of allIds) {
      const delta = (newMap.get(pid) ?? 0) - (oldMap.get(pid) ?? 0)
      if (delta !== 0) {
        const info = prodInfo.get(pid)
        if (info) lines.push({ name: info.name, delta, stock: info.stock })
      }
    }
    return lines.sort((a, b) => a.name.localeCompare(b.name))
  }, [isConfirmed, deltaData, order.order_items, editItems])

  // ── Computed totals ─────────────────────────────────────────────────────────

  const subtotal = editItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const total    = subtotal + order.delivery_cost

  // ── Item helpers ────────────────────────────────────────────────────────────

  const addCatalogItem = (item: AdminCatalogItem) => {
    const key = `new-${keyRef.current++}`
    setEditItems(prev => [...prev, {
      key,
      product_id: item.type === 'product' ? item.id : null,
      combo_id:   item.type === 'combo'   ? item.id : null,
      item_name:  item.name,
      unit_price: item.price,
      quantity:   1,
    }])
    setCatalogSearch('')
  }

  const removeItem = (key: string) => setEditItems(prev => prev.filter(i => i.key !== key))
  const setQty = (key: string, qty: number) => {
    if (qty < 1) return
    setEditItems(prev => prev.map(i => i.key === key ? { ...i, quantity: qty } : i))
  }

  // ── Save mutation ───────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error: metaErr } = await supabase
        .from('orders')
        .update({
          customer_name:  nombre.trim(),
          address:        order.delivery_type === 'delivery' ? (direccion.trim() || null) : null,
          comment:        comentario.trim() || null,
          payment_method: pago,
        })
        .eq('id', order.id)
      if (metaErr) throw metaErr

      const { data, error } = await supabase.rpc('update_order_items', {
        p_order_id: order.id,
        p_items: editItems.map(i => ({
          product_id: i.product_id,
          combo_id:   i.combo_id,
          item_name:  i.item_name,
          unit_price: i.unit_price,
          quantity:   i.quantity,
        })),
      })
      if (error) throw error
      return data as { negative_stock: { product_id: string; name: string; stock: number }[] }
    },
    onSuccess: (data) => {
      const neg = data?.negative_stock ?? []
      if (neg.length > 0) {
        const list = neg.map(p => `${p.name} (${p.stock})`).join(', ')
        toast.error(`Guardado — stock negativo: ${list}`, { duration: 7000 })
      } else {
        toast.success('Pedido actualizado')
      }
      onSaved()
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar el pedido'),
  })

  const canSave = editItems.length > 0 && nombre.trim() !== '' && !saveMutation.isPending

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <ModalOverlay onClose={onClose} wide>
      {/* Header */}
      <div className="px-6 pt-6 pb-3 flex items-start justify-between border-b border-orange-900/15">
        <div>
          <h2 className="font-black text-stone-100 text-lg uppercase tracking-tight">Editar pedido</h2>
          <p className="text-stone-500 text-xs mt-0.5">Ref #{order.reference} · {order.customer_name}</p>
        </div>
        <button onClick={onClose} className="text-stone-600 hover:text-stone-400"><X size={18} /></button>
      </div>

      <div className="px-6 pb-6 pt-5 space-y-6">

        {/* Confirmed warning */}
        {isConfirmed && (
          <div className="flex items-start gap-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3.5">
            <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200 leading-relaxed">
              <strong className="text-yellow-300">Este pedido ya descontó stock.</strong>{' '}
              Los cambios ajustarán el stock automáticamente.
            </p>
          </div>
        )}

        {/* ── Customer fields ── */}
        <section className="space-y-3">
          <p className="text-[11px] font-black text-stone-500 uppercase tracking-widest">Datos del cliente</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-stone-600 uppercase tracking-wider mb-1">Nombre *</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} className={inp} placeholder="Juan Pérez" />
            </div>
            {order.delivery_type === 'delivery' && (
              <div>
                <label className="block text-[10px] font-black text-stone-600 uppercase tracking-wider mb-1">Dirección</label>
                <input value={direccion} onChange={e => setDireccion(e.target.value)} className={inp} placeholder="Calle 123" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black text-stone-600 uppercase tracking-wider mb-1">Comentario</label>
            <textarea value={comentario} onChange={e => setComentario(e.target.value)}
              rows={2} className={`${inp} resize-none`} placeholder="Sin comentarios" />
          </div>

          <div>
            <label className="block text-[10px] font-black text-stone-600 uppercase tracking-wider mb-2">Método de pago</label>
            <div className="flex gap-3">
              {(['efectivo', 'transferencia'] as const).map(v => (
                <label key={v} className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer
                  transition-all text-sm font-bold select-none ${
                  pago === v
                    ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                    : 'bg-[#2a1608] border-orange-900/30 text-stone-500 hover:border-orange-700/50'
                }`}>
                  <input type="radio" className="sr-only" checked={pago === v} onChange={() => setPago(v)} />
                  <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${pago === v ? 'border-orange-500 bg-orange-500/60' : 'border-stone-700'}`} />
                  {v === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* ── Items ── */}
        <section className="space-y-3">
          <p className="text-[11px] font-black text-stone-500 uppercase tracking-widest">Ítems del pedido</p>

          {editItems.length === 0 ? (
            <p className="text-stone-600 text-sm text-center py-5 italic">
              Sin ítems. Usá el buscador para agregar productos o combos.
            </p>
          ) : (
            <div className="bg-[#120c06] border border-orange-900/15 rounded-xl overflow-hidden">
              {editItems.map(item => (
                <div key={item.key}
                  className="flex items-center gap-2 px-4 py-3 border-b border-orange-900/10 last:border-0">
                  <span className="flex-1 text-sm font-bold text-stone-200 truncate min-w-0">{item.item_name}</span>
                  <span className="text-xs text-stone-600 shrink-0">${fmt(item.unit_price)}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setQty(item.key, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-[#1a1008] flex items-center justify-center
                        text-stone-400 hover:bg-orange-500/20 hover:text-orange-400 transition-colors">
                      <Minus size={11} />
                    </button>
                    <span className="w-7 text-center font-black text-stone-100 text-sm">{item.quantity}</span>
                    <button onClick={() => setQty(item.key, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-[#1a1008] flex items-center justify-center
                        text-stone-400 hover:bg-orange-500/20 hover:text-orange-400 transition-colors">
                      <Plus size={11} />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-orange-400 shrink-0 w-20 text-right">
                    ${fmt(item.unit_price * item.quantity)}
                  </span>
                  <button onClick={() => removeItem(item.key)}
                    className="text-stone-600 hover:text-red-400 transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Running totals */}
          <div className="space-y-1 px-1">
            <div className="flex justify-between text-sm text-stone-500">
              <span>Subtotal</span>
              <span className="font-bold">${fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-stone-500">
              <span>Envío</span>
              <span className="font-bold">
                {order.delivery_cost > 0 ? `$${fmt(order.delivery_cost)}` : 'Gratis'}
              </span>
            </div>
            <div className="flex justify-between font-black text-orange-400 text-lg
              border-t border-orange-900/20 pt-2 mt-1">
              <span>Total</span>
              <span>${fmt(total)}</span>
            </div>
          </div>

          {/* Catalog search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none" />
            <input
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
              placeholder="Buscar producto o combo para agregar... (min. 2 caracteres)"
              className={`${inp} pl-8`}
            />
            {catalogSearch && (
              <button onClick={() => setCatalogSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400">
                <X size={13} />
              </button>
            )}
          </div>

          {catalogResults.length > 0 && (
            <div className="bg-[#0f0904] border border-orange-900/25 rounded-xl overflow-hidden">
              {catalogResults.map(item => (
                <button key={item.id} type="button" onClick={() => addCatalogItem(item)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm
                    hover:bg-orange-500/10 transition-colors border-b border-orange-900/10 last:border-0 text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] font-black text-stone-700 uppercase shrink-0">
                      {item.type === 'product' ? 'Prod' : 'Combo'}
                    </span>
                    <span className="font-bold text-stone-200 truncate">{item.name}</span>
                    {item.stock !== undefined && (
                      <span className={`text-xs font-black shrink-0 ${
                        item.stock <= 0 ? 'text-red-400' : item.stock <= 5 ? 'text-yellow-400' : 'text-stone-600'
                      }`}>
                        stock: {item.stock}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-orange-400 font-bold">${fmt(item.price)}</span>
                    <Plus size={14} className="text-orange-500" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Stock delta (confirmed only) ── */}
        {isConfirmed && stockDeltaLines.length > 0 && (
          <section className="space-y-2">
            <p className="text-[11px] font-black text-stone-500 uppercase tracking-widest">
              Ajuste de stock al guardar
            </p>
            <div className="bg-[#120c06] border border-orange-900/15 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-orange-900/10">
                    {['Producto', 'Cambio', 'Stock actual', 'Resultante'].map(h => (
                      <th key={h} className={`py-2.5 px-3 text-[10px] font-black text-stone-600 uppercase tracking-wider
                        ${h === 'Producto' ? 'text-left' : 'text-right'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockDeltaLines.map((line, i) => {
                    const result = line.stock - line.delta
                    const neg = result < 0
                    return (
                      <tr key={i} className="border-b border-orange-900/10 last:border-0">
                        <td className="px-3 py-2.5 font-bold text-stone-200">{line.name}</td>
                        <td className={`px-3 py-2.5 text-right font-bold ${line.delta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {line.delta > 0 ? `-${line.delta}` : `+${Math.abs(line.delta)}`}
                        </td>
                        <td className="px-3 py-2.5 text-right text-stone-500">{line.stock}</td>
                        <td className={`px-3 py-2.5 text-right font-black ${neg ? 'text-red-400' : 'text-green-400'}`}>
                          {result}{neg && ' ⚠'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Footer actions ── */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={saveMutation.isPending}
            className="flex-1 py-3 rounded-xl border border-orange-900/30 text-stone-400 font-black
              text-sm uppercase tracking-widest hover:border-orange-700/50 hover:text-stone-200
              transition-all disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!canSave}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              bg-orange-600 hover:bg-orange-500 text-white font-black text-sm uppercase
              tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending
              ? <Loader2 size={15} className="animate-spin" />
              : <CheckCircle2 size={15} />}
            {saveMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── OrderCard ──────────────────────────────────────────────────────────────────

function OrderCard({
  order, expanded, onToggle, onConfirm, onCancel, onEdit,
}: {
  order: OrderWithItems
  expanded: boolean
  onToggle: () => void
  onConfirm: () => void
  onCancel: () => void
  onEdit: () => void
}) {
  return (
    <div className={`bg-[#1a1008] border rounded-2xl overflow-hidden transition-colors ${
      order.status === 'pending' ? 'border-yellow-900/30' : 'border-orange-900/20'
    }`}>
      {/* Collapsed header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left
          hover:bg-white/[0.015] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <span className="font-black text-orange-400 text-sm tracking-wide">
              Ref #{order.reference}
            </span>
            <span className="text-stone-600 text-xs">{fmtDate(order.created_at)}</span>
            <StatusBadge status={order.status} />
            {order.source === 'manual' && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest
                bg-blue-500/15 text-blue-400 border-blue-500/25">
                Manual
              </span>
            )}
          </div>
          <p className="font-bold text-stone-200 truncate">{order.customer_name}</p>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-stone-600 flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {order.delivery_type === 'delivery'
                ? `Delivery${order.address ? ` · ${order.address}` : ''}`
                : 'Retiro en local'}
            </span>
            <span className="flex items-center gap-1">
              <CreditCard size={11} />
              {order.payment_method === 'efectivo' ? 'Efectivo' : 'Transferencia'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-black text-orange-400 text-xl">${fmt(order.total)}</span>
          {expanded
            ? <ChevronUp size={16} className="text-stone-600" />
            : <ChevronDown size={16} className="text-stone-600" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-orange-900/15 px-5 pb-5 pt-4 space-y-4">
          {/* Items table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[380px]">
              <thead>
                <tr className="border-b border-orange-900/10">
                  <th className="py-2 text-left text-[11px] font-black text-stone-600 uppercase tracking-wider w-12">
                    Cant.
                  </th>
                  <th className="py-2 text-left text-[11px] font-black text-stone-600 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="py-2 text-right text-[11px] font-black text-stone-600 uppercase tracking-wider">
                    P. Unit.
                  </th>
                  <th className="py-2 text-right text-[11px] font-black text-stone-600 uppercase tracking-wider">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.order_items.map(item => (
                  <tr key={item.id} className="border-b border-orange-900/10 last:border-0">
                    <td className="py-2.5 text-stone-400 font-bold">{item.quantity}×</td>
                    <td className="py-2.5 text-stone-200 font-bold">{item.item_name}</td>
                    <td className="py-2.5 text-right text-stone-500">${fmt(item.unit_price)}</td>
                    <td className="py-2.5 text-right font-bold text-stone-300">${fmt(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-[#120c06] border border-orange-900/15 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal</span>
              <span className="font-bold">${fmt(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>Envío</span>
              <span className="font-bold">
                {order.delivery_cost > 0 ? `$${fmt(order.delivery_cost)}` : 'Gratis'}
              </span>
            </div>
            <div className="flex justify-between font-black text-orange-400 text-lg
              border-t border-orange-900/20 pt-2 mt-1">
              <span>Total</span>
              <span>${fmt(order.total)}</span>
            </div>
          </div>

          {/* Comment */}
          {order.comment && (
            <div className="flex items-start gap-2.5 bg-[#120c06] border border-orange-900/15 rounded-xl p-3.5">
              <MessageSquare size={13} className="text-stone-600 shrink-0 mt-0.5" />
              <p className="text-stone-400 text-sm leading-relaxed">{order.comment}</p>
            </div>
          )}

          {/* Confirmed timestamp */}
          {order.status === 'confirmed' && order.confirmed_at && (
            <div className="flex items-center gap-2 text-green-500/70 text-xs font-bold">
              <CheckCircle2 size={13} />
              Confirmado el {fmtDate(order.confirmed_at)} · Stock descontado
            </div>
          )}

          {/* Actions */}
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <div className="flex flex-wrap gap-3 pt-1">
              {order.status === 'pending' && (
                <>
                  <button
                    onClick={onConfirm}
                    className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white
                      font-black px-4 py-2.5 rounded-xl text-sm uppercase tracking-widest transition-colors"
                  >
                    <CheckCircle2 size={15} />
                    Confirmar venta
                  </button>
                  <button
                    onClick={onCancel}
                    className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50
                      border border-red-800/40 hover:border-red-700/50 text-red-400
                      font-black px-4 py-2.5 rounded-xl text-sm uppercase tracking-widest transition-colors"
                  >
                    <XCircle size={15} />
                    Cancelar pedido
                  </button>
                </>
              )}
              <button
                onClick={onEdit}
                className="flex items-center gap-2 bg-[#2a1608] hover:bg-orange-500/10
                  border border-orange-900/30 hover:border-orange-500/40 text-stone-400
                  hover:text-orange-400 font-black px-4 py-2.5 rounded-xl text-sm
                  uppercase tracking-widest transition-colors"
              >
                <Pencil size={15} />
                Editar pedido
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── AdminOrders (page) ─────────────────────────────────────────────────────────

export default function AdminOrders() {
  const qc = useQueryClient()

  const [searchParams] = useSearchParams()
  const initialTab = (() => {
    const s = searchParams.get('status')
    if (s === 'pending' || s === 'confirmed' || s === 'cancelled') return s as OrderStatus
    return 'pending' as OrderStatus
  })()

  const [activeTab,       setActiveTab]       = useState<OrderStatus>(initialTab)
  const [search,          setSearch]          = useState('')
  const [expandedId,      setExpandedId]      = useState<string | null>(null)
  const [confirmId,       setConfirmId]       = useState<string | null>(null)
  const [cancelId,        setCancelId]        = useState<string | null>(null)
  const [editId,          setEditId]          = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // ── Counts (shared cache with sidebar) ──────────────────────

  const countPending = useQuery({
    queryKey: PENDING_COUNT_KEY,
    queryFn: async () => {
      const { count } = await supabase.from('orders')
        .select('*', { count: 'exact', head: true }).eq('status', 'pending')
      return count ?? 0
    },
  })
  const countConfirmed = useQuery({
    queryKey: ['admin', 'orders', 'count', 'confirmed'],
    queryFn: async () => {
      const { count } = await supabase.from('orders')
        .select('*', { count: 'exact', head: true }).eq('status', 'confirmed')
      return count ?? 0
    },
  })
  const countCancelled = useQuery({
    queryKey: ['admin', 'orders', 'count', 'cancelled'],
    queryFn: async () => {
      const { count } = await supabase.from('orders')
        .select('*', { count: 'exact', head: true }).eq('status', 'cancelled')
      return count ?? 0
    },
  })

  // ── Order list ───────────────────────────────────────────────

  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ['admin', 'orders', 'list', activeTab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('status', activeTab)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as OrderWithItems[]
    },
  })

  const filtered = search
    ? orders.filter(o =>
        o.reference.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(search.toLowerCase())
      )
    : orders

  // ── Mutations ────────────────────────────────────────────────

  const invalidateOrders = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
    qc.invalidateQueries({ queryKey: ['admin', 'products'] })
    qc.invalidateQueries({ queryKey: ['admin', 'modal_stocks'] })
    qc.invalidateQueries({ queryKey: ['admin', 'modal_combos'] })
    qc.invalidateQueries({ queryKey: ['catalog_items'] })
    qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
  }

  const confirmMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.rpc('confirm_order', { p_order_id: orderId })
      if (error) throw error
      return data as { negative_stock: { product_id: string; name: string; stock: number }[] }
    },
    onSuccess: (data) => {
      setConfirmId(null)
      setExpandedId(null)
      const neg = data?.negative_stock ?? []
      if (neg.length > 0) {
        const list = neg.map(p => `${p.name} (${p.stock})`).join(', ')
        toast.error(`Confirmado — stock negativo: ${list}`, { duration: 7000 })
      } else {
        toast.success('Pedido confirmado y stock descontado')
      }
      invalidateOrders()
    },
    onError: (e: Error) => toast.error(e.message || 'Error al confirmar el pedido'),
  })

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId })
      if (error) throw error
    },
    onSuccess: () => {
      setCancelId(null)
      setExpandedId(null)
      toast.success('Pedido cancelado')
      invalidateOrders()
    },
    onError: (e: Error) => toast.error(e.message || 'Error al cancelar el pedido'),
  })

  // ── Derived ──────────────────────────────────────────────────

  const confirmOrder = orders.find(o => o.id === confirmId)
  const cancelOrder  = orders.find(o => o.id === cancelId)
  const editOrder    = orders.find(o => o.id === editId)

  const TABS: { status: OrderStatus; label: string; count: number | undefined }[] = [
    { status: 'pending',   label: 'Pendientes',  count: countPending.data   },
    { status: 'confirmed', label: 'Confirmados', count: countConfirmed.data },
    { status: 'cancelled', label: 'Cancelados',  count: countCancelled.data },
  ]

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-7 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-stone-100 uppercase tracking-tight">Pedidos</h1>
          <p className="text-stone-600 text-sm mt-1">Pedidos recibidos por WhatsApp o cargados manualmente.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white
            font-black px-4 py-2.5 rounded-xl text-sm uppercase tracking-widest transition-colors shrink-0"
        >
          <ClipboardList size={15} />
          Cargar pedido manual
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 mb-5 p-1 bg-[#1a1008] border border-orange-900/20 rounded-xl w-fit flex-wrap">
        {TABS.map(({ status, label, count }) => (
          <button
            key={status}
            onClick={() => { setActiveTab(status); setExpandedId(null); setSearch('') }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black
              uppercase tracking-widest transition-all ${
              activeTab === status
                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                : 'text-stone-600 hover:text-stone-400 border border-transparent'
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                status === 'pending'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : status === 'confirmed'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-stone-500/20 text-stone-500'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por referencia o nombre del cliente..."
          className="w-full bg-[#1a1008] border border-orange-900/20 rounded-xl pl-9 pr-9 py-2.5
            text-stone-100 placeholder-stone-700 focus:outline-none focus:border-orange-500/50 text-sm font-medium"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#1a1008] border border-orange-900/20 rounded-2xl p-5 animate-pulse">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-20 bg-stone-800 rounded" />
                    <div className="h-3.5 w-16 bg-stone-800/60 rounded" />
                    <div className="h-5 w-20 bg-stone-800/40 rounded-full" />
                  </div>
                  <div className="h-4 w-36 bg-stone-800 rounded" />
                  <div className="h-3 w-48 bg-stone-800/40 rounded" />
                </div>
                <div className="h-7 w-20 bg-stone-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-stone-600">
          <Package2 size={48} strokeWidth={1.5} />
          <p className="font-black text-stone-400 text-lg">
            {search
              ? 'Sin resultados para la búsqueda'
              : activeTab === 'pending'
                ? 'No hay pedidos pendientes'
                : activeTab === 'confirmed'
                  ? 'No hay pedidos confirmados'
                  : 'No hay pedidos cancelados'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
              onConfirm={() => setConfirmId(order.id)}
              onCancel={() => setCancelId(order.id)}
              onEdit={() => setEditId(order.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateManualOrderModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(ref) => {
            setShowCreateModal(false)
            setActiveTab('confirmed')
            toast.success(`Pedido manual confirmado — Ref #${ref}`)
            invalidateOrders()
          }}
        />
      )}
      {confirmId && confirmOrder && (
        <ConfirmModal
          order={confirmOrder}
          isPending={confirmMutation.isPending}
          onConfirm={() => confirmMutation.mutate(confirmId)}
          onClose={() => setConfirmId(null)}
        />
      )}
      {cancelId && cancelOrder && (
        <CancelModal
          order={cancelOrder}
          isPending={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate(cancelId)}
          onClose={() => setCancelId(null)}
        />
      )}
      {editId && editOrder && (
        <EditOrderModal
          order={editOrder}
          onClose={() => setEditId(null)}
          onSaved={() => {
            setEditId(null)
            setExpandedId(null)
            invalidateOrders()
          }}
        />
      )}
    </div>
  )
}
