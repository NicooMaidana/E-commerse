import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckCircle, ChevronDown, ChevronUp, AlertTriangle, X, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import type { Product } from '../../types'

/* ── types ── */

interface OrderItem {
  productId: string
  productName: string
  currentStock: number
  quantity: number
}

type StockLog = {
  id: string
  raw_message: string | null
  parsed_items: unknown
  confirmed_at: string | null
  notes: string | null
  created_at: string
}

/* ── component ── */

export default function AdminOrders() {
  const qc = useQueryClient()

  const [rawMessage, setRawMessage] = useState('')
  const [items, setItems]           = useState<OrderItem[]>([])
  const [notes, setNotes]           = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  /* data */
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock, images, description, category_id, visible, created_at')
        .order('name')
      if (error) throw error
      return data ?? []
    },
  })

  const { data: history = [] } = useQuery<StockLog[]>({
    queryKey: ['admin', 'stock_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_logs')
        .select('id, raw_message, parsed_items, confirmed_at, notes, created_at')
        .not('confirmed_at', 'is', null)
        .order('confirmed_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data ?? []
    },
  })

  /* product search results (excludes already added) */
  const addedIds = new Set(items.map((i) => i.productId))
  const searchResults = productSearch
    ? products
        .filter(
          (p) =>
            !addedIds.has(p.id) &&
            p.name.toLowerCase().includes(productSearch.toLowerCase())
        )
        .slice(0, 8)
    : []

  /* add product */
  const addProduct = (p: Product) => {
    setItems((prev) => [
      ...prev,
      { productId: p.id, productName: p.name, currentStock: p.stock, quantity: 1 },
    ])
    setProductSearch('')
  }

  const removeItem = (productId: string) =>
    setItems((prev) => prev.filter((i) => i.productId !== productId))

  const setQty = (productId: string, qty: number) =>
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i
      )
    )

  /* confirm & discount */
  const confirmMutation = useMutation({
    mutationFn: async () => {
      for (const item of items) {
        const newStock = item.currentStock - item.quantity
        const { error } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', item.productId)
        if (error) throw error
      }

      const { error: logErr } = await supabase.from('stock_logs').insert({
        raw_message:  rawMessage.trim() || null,
        parsed_items: items.map((i) => ({
          product_id:   i.productId,
          product_name: i.productName,
          quantity:     i.quantity,
        })),
        confirmed_at: new Date().toISOString(),
        notes:        notes.trim() || null,
      })
      if (logErr) throw logErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['catalog_items'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stock_logs'] })
      toast.success('Stock descontado y pedido registrado')
      setItems([])
      setRawMessage('')
      setNotes('')
    },
    onError: (e: Error) => toast.error(e.message || 'Error al confirmar'),
  })

  const hasNegative = items.some((i) => i.currentStock - i.quantity < 0)
  const canConfirm  = items.length > 0

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-100 uppercase tracking-tight">
          Procesar pedido
        </h1>
        <p className="text-stone-600 text-sm mt-1">
          Registrá los productos del pedido y descontá el stock.
        </p>
      </div>

      <div className="space-y-5">
        {/* Mensaje original (opcional) */}
        <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl p-5 space-y-3">
          <label className="block text-[11px] font-black text-stone-500 uppercase tracking-widest">
            Mensaje del pedido (opcional, solo referencia)
          </label>
          <textarea
            value={rawMessage}
            onChange={(e) => setRawMessage(e.target.value)}
            placeholder={'Buenas! Quería pedir:\n- 3 empanadas de carne\n- 2 medialunas'}
            rows={4}
            className="w-full bg-[#251608] border border-orange-900/25 rounded-xl px-4 py-3
              text-stone-100 placeholder-stone-700 focus:outline-none focus:border-orange-500/50
              text-sm resize-none font-mono"
          />
        </div>

        {/* Buscador de productos */}
        <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl p-5 space-y-4">
          <label className="block text-[11px] font-black text-stone-500 uppercase tracking-widest">
            Agregar productos al pedido
          </label>

          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none"
            />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Buscar producto por nombre..."
              className="w-full bg-[#251608] border border-orange-900/25 rounded-xl pl-9 pr-4 py-2.5
                text-stone-100 placeholder-stone-700 focus:outline-none focus:border-orange-500/50 text-sm"
            />
          </div>

          {/* Dropdown de resultados */}
          {searchResults.length > 0 && (
            <div className="bg-[#0f0904] border border-orange-900/25 rounded-xl overflow-hidden">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm
                    hover:bg-orange-500/10 transition-colors border-b border-orange-900/10
                    last:border-0 text-left"
                >
                  <div>
                    <span className="font-bold text-stone-200">{p.name}</span>
                    <span className={`ml-3 text-xs font-black ${
                      p.stock === 0 ? 'text-red-400' :
                      p.stock <= 5  ? 'text-yellow-400' : 'text-stone-500'
                    }`}>
                      stock: {p.stock}
                    </span>
                  </div>
                  <Plus size={14} className="text-orange-500 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {productSearch && searchResults.length === 0 && (
            <p className="text-xs text-stone-600 font-bold text-center py-2">
              Sin resultados para &ldquo;{productSearch}&rdquo;
            </p>
          )}

          {/* Items seleccionados */}
          {items.length > 0 && (
            <div className="border-t border-orange-900/20 pt-4 space-y-2">
              <p className="text-[11px] font-black text-stone-600 uppercase tracking-widest mb-3">
                Productos seleccionados
              </p>
              {items.map((item) => {
                const resulting = item.currentStock - item.quantity
                const isNeg     = resulting < 0
                return (
                  <div
                    key={item.productId}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
                      isNeg
                        ? 'bg-red-950/30 border-red-800/40'
                        : 'bg-[#251608] border-orange-900/20'
                    }`}
                  >
                    {isNeg && (
                      <AlertTriangle size={14} className="text-red-400 shrink-0" />
                    )}
                    <span className="flex-1 font-bold text-sm text-stone-200 truncate">
                      {item.productName}
                    </span>

                    {/* Stock info */}
                    <span className="text-xs text-stone-600 shrink-0">
                      stock:{' '}
                      <span className={`font-black ${
                        item.currentStock === 0 ? 'text-red-400' :
                        item.currentStock <= 5  ? 'text-yellow-400' : 'text-stone-400'
                      }`}>
                        {item.currentStock}
                      </span>
                      {' → '}
                      <span className={`font-black ${
                        isNeg ? 'text-red-400' :
                        resulting <= 5 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {resulting}
                      </span>
                    </span>

                    {/* Quantity */}
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => setQty(item.productId, parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-14 bg-[#1a1008] border border-orange-900/25 rounded-lg
                        px-2 py-1 text-sm text-center text-stone-100 focus:outline-none
                        focus:border-orange-500/50"
                    />

                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-stone-600 hover:text-red-400 transition-colors"
                      aria-label={`Quitar ${item.productName}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Notas + confirmar */}
        {items.length > 0 && (
          <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl p-5 space-y-4">
            {hasNegative && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl p-3">
                <AlertTriangle size={15} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-300 font-bold">
                  Algunos productos quedarían con stock negativo. Verificá las cantidades.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-stone-500 uppercase tracking-widest">
                Notas (opcional)
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones del pedido..."
                className="w-full bg-[#251608] border border-orange-900/25 rounded-xl px-3 py-2.5
                  text-stone-100 placeholder-stone-700 focus:outline-none focus:border-orange-500/50 text-sm"
              />
            </div>

            <button
              onClick={() => confirmMutation.mutate()}
              disabled={!canConfirm || confirmMutation.isPending}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white
                font-black px-5 py-3 rounded-xl text-sm uppercase tracking-widest
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={16} />
              {confirmMutation.isPending ? 'Procesando...' : 'Confirmar y descontar stock'}
            </button>
          </div>
        )}

        {/* Historial */}
        <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl overflow-hidden">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-4
              hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-[11px] font-black text-stone-500 uppercase tracking-widest">
              Historial de pedidos procesados ({history.length})
            </span>
            {historyOpen ? (
              <ChevronUp size={16} className="text-stone-600" />
            ) : (
              <ChevronDown size={16} className="text-stone-600" />
            )}
          </button>

          {historyOpen && (
            <div className="border-t border-orange-900/15">
              {history.length === 0 ? (
                <p className="text-center text-stone-600 text-sm font-bold py-8">
                  Sin pedidos procesados aún
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-orange-900/10">
                      {['Fecha', 'Mensaje', 'Ítems', 'Notas'].map((h) => (
                        <th
                          key={h}
                          className="text-left px-5 py-3 text-[11px] font-black
                            text-stone-600 uppercase tracking-widest"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-orange-900/10 hover:bg-white/[0.015] transition-colors"
                      >
                        <td className="px-5 py-3 text-stone-500 text-xs whitespace-nowrap">
                          {log.confirmed_at
                            ? new Date(log.confirmed_at).toLocaleString('es-AR', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : '—'}
                        </td>
                        <td className="px-5 py-3 max-w-[220px]">
                          <p className="text-stone-500 text-xs truncate font-mono">
                            {log.raw_message ?? '—'}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-stone-500 text-xs">
                          {Array.isArray(log.parsed_items) ? log.parsed_items.length : '—'}
                        </td>
                        <td className="px-5 py-3 text-stone-500 text-xs max-w-[160px]">
                          <span className="truncate block">{log.notes ?? '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
