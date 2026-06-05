import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import type { TickerMessage } from '../../types'

/* ── component ── */

export default function AdminBanners() {
  const qc = useQueryClient()

  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState<TickerMessage | null>(null)
  const [content, setContent]   = useState('')
  const [active, setActive]     = useState(true)
  const [deleting, setDeleting] = useState<TickerMessage | null>(null)

  const { data: messages = [], isLoading } = useQuery<TickerMessage[]>({
    queryKey: ['admin', 'ticker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticker_messages')
        .select('*')
        .order('display_order', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })

  /* open modal */
  const openCreate = () => {
    setEditing(null)
    setContent('')
    setActive(true)
    setModal(true)
  }

  const openEdit = (m: TickerMessage) => {
    setEditing(m)
    setContent(m.content)
    setActive(m.active)
    setModal(true)
  }

  /* save */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        content: content.trim(),
        active,
        display_order: editing?.display_order ?? (messages.length + 1),
      }
      if (editing) {
        const { error } = await supabase.from('ticker_messages').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('ticker_messages').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ticker'] })
      qc.invalidateQueries({ queryKey: ['ticker_messages'] })
      toast.success(editing ? 'Mensaje actualizado' : 'Mensaje creado')
      setModal(false)
    },
    onError: () => toast.error('Error al guardar'),
  })

  /* toggle active */
  const toggleMutation = useMutation({
    mutationFn: async (m: TickerMessage) => {
      const { error } = await supabase
        .from('ticker_messages')
        .update({ active: !m.active })
        .eq('id', m.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ticker'] })
      qc.invalidateQueries({ queryKey: ['ticker_messages'] })
    },
    onError: () => toast.error('Error'),
  })

  /* reorder */
  const reorderMutation = useMutation({
    mutationFn: async (reordered: TickerMessage[]) => {
      for (let i = 0; i < reordered.length; i++) {
        const { error } = await supabase
          .from('ticker_messages')
          .update({ display_order: i + 1 })
          .eq('id', reordered[i].id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ticker'] })
      qc.invalidateQueries({ queryKey: ['ticker_messages'] })
    },
    onError: () => toast.error('Error al reordenar'),
  })

  const move = (index: number, dir: 'up' | 'down') => {
    const arr = [...messages]
    const swapWith = dir === 'up' ? index - 1 : index + 1
    if (swapWith < 0 || swapWith >= arr.length) return
    ;[arr[index], arr[swapWith]] = [arr[swapWith], arr[index]]
    reorderMutation.mutate(arr)
  }

  /* delete */
  const deleteMutation = useMutation({
    mutationFn: async (m: TickerMessage) => {
      const { error } = await supabase.from('ticker_messages').delete().eq('id', m.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ticker'] })
      qc.invalidateQueries({ queryKey: ['ticker_messages'] })
      toast.success('Mensaje eliminado')
      setDeleting(null)
    },
    onError: () => { toast.error('Error al eliminar'); setDeleting(null) },
  })

  /* preview text from active messages */
  const activeMessages = messages.filter((m) => m.active)
  const previewText = activeMessages.map((m) => m.content).join('   ★   ')
  const previewContent = previewText
    ? Array(4).fill(previewText).join('   ★   ') + '   ★   '
    : null

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-stone-100 uppercase tracking-tight">
            Banners / Ticker
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            {messages.length} mensajes · {activeMessages.length} activos
          </p>
        </div>
        <button onClick={openCreate} className={btnPrimary}>
          <Plus size={16} /> Nuevo mensaje
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#1d1729] border border-[#3a2e4f]/20 rounded-2xl overflow-hidden mb-8">
        {isLoading ? <Loader /> : messages.length === 0 ? <Empty text="Sin mensajes aún" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#3a2e4f]/15">
                {['Orden', 'Contenido', 'Activo', ''].map((h) => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {messages.map((m, i) => (
                <tr key={m.id} className={trClass}>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => move(i, 'up')}
                        disabled={i === 0 || reorderMutation.isPending}
                        className="text-stone-600 hover:text-amber-300 disabled:opacity-20 transition-colors"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <span className="text-stone-500 text-xs font-black text-center">{i + 1}</span>
                      <button
                        onClick={() => move(i, 'down')}
                        disabled={i === messages.length - 1 || reorderMutation.isPending}
                        className="text-stone-600 hover:text-amber-300 disabled:opacity-20 transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 max-w-md">
                    <p className="text-stone-200 font-medium truncate">{m.content}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => toggleMutation.mutate(m)}
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider transition-all ${
                        m.active
                          ? 'bg-green-900/30 text-green-400 border-green-800/40 hover:bg-green-900/50'
                          : 'bg-stone-900/50 text-stone-500 border-stone-700/40 hover:bg-stone-900/70'
                      }`}
                    >
                      {m.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(m)} className="text-stone-500 hover:text-amber-300 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeleting(m)} className="text-stone-500 hover:text-red-400 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Live preview */}
      <div className="bg-[#1d1729] border border-[#3a2e4f]/20 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#3a2e4f]/15">
          <Eye size={14} className="text-amber-400" />
          <span className="text-[11px] font-black text-stone-600 uppercase tracking-widest">
            Preview en tiempo real
          </span>
        </div>
        {previewContent ? (
          <div className="bg-amber-400 overflow-hidden py-2.5">
            <div className="ticker-track whitespace-nowrap" style={{ display: 'inline-block' }}>
              <span className="text-white font-black text-sm tracking-wide">
                {previewContent}{previewContent}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-center text-stone-700 text-xs font-bold py-4">
            Sin mensajes activos para previsualizar
          </p>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Editar mensaje' : 'Nuevo mensaje'}
      >
        <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-black text-stone-500 uppercase tracking-widest">
              Contenido *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              placeholder="¡Envíos a todo el barrio! 🛵 Pedí ahora por WhatsApp"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 accent-amber-400"
            />
            <span className="text-sm text-stone-300 font-bold">Mensaje activo</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className={`${btnPrimary} flex-1 justify-center`}
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setModal(false)} className={btnSecondary}>
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Eliminar mensaje" maxWidth="max-w-sm">
        <p className="text-stone-300 text-sm mb-5">¿Eliminás este mensaje del ticker?</p>
        <div className="flex gap-3">
          <button
            onClick={() => deleting && deleteMutation.mutate(deleting)}
            disabled={deleteMutation.isPending}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-2 rounded-xl text-sm uppercase tracking-wide transition-colors"
          >
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
          <button onClick={() => setDeleting(null)} className={btnSecondary}>Cancelar</button>
        </div>
      </Modal>
    </div>
  )
}

function Loader() {
  return <div className="flex justify-center p-12"><div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" /></div>
}

function Empty({ text }: { text: string }) {
  return <p className="text-center text-stone-600 text-sm font-bold py-12">{text}</p>
}

const thClass = 'text-left px-5 py-3 text-[11px] font-black text-stone-600 uppercase tracking-widest'
const trClass = 'border-b border-[#3a2e4f]/10 hover:bg-white/[0.015] transition-colors'

const inputClass =
  'w-full bg-[#261d36] border border-[#3a2e4f]/25 rounded-xl px-3 py-2.5 ' +
  'text-stone-100 placeholder-stone-700 focus:outline-none focus:border-amber-400/50 text-sm'

const btnPrimary =
  'flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-white ' +
  'font-black px-4 py-2 rounded-xl text-sm uppercase tracking-wide transition-colors'

const btnSecondary =
  'flex items-center gap-2 bg-[#261d36] hover:bg-[#351a08] text-stone-300 ' +
  'font-bold px-4 py-2 rounded-xl text-sm border border-[#3a2e4f]/25 transition-colors'
