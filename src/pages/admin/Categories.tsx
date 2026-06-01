import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import type { Category } from '../../types'

/* ── helpers ── */

const toSlug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

interface FormState {
  name: string
  slug: string
  icon: string
  display_order: string
  visible: boolean
}

const EMPTY: FormState = {
  name: '',
  slug: '',
  icon: '',
  display_order: '',
  visible: true,
}

/* ── component ── */

export default function AdminCategories() {
  const qc = useQueryClient()

  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState<Category | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [deleting, setDeleting]   = useState<Category | null>(null)

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })

  /* open modal */
  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setSlugTouched(false)
    setModal(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    setForm({
      name:          cat.name,
      slug:          cat.slug,
      icon:          cat.icon ?? '',
      display_order: cat.display_order != null ? String(cat.display_order) : '',
      visible:       cat.visible,
    })
    setSlugTouched(true)
    setModal(true)
  }

  /* form helpers */
  const setName = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: slugTouched ? f.slug : toSlug(name),
    }))
  }

  /* save mutation */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name:          form.name.trim(),
        slug:          form.slug.trim(),
        icon:          form.icon.trim() || null,
        display_order: form.display_order ? parseInt(form.display_order) : null,
        visible:       form.visible,
      }
      if (editing) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('categories').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success(editing ? 'Categoría actualizada' : 'Categoría creada')
      setModal(false)
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar'),
  })

  /* toggle visible */
  const toggleMutation = useMutation({
    mutationFn: async (cat: Category) => {
      const { error } = await supabase
        .from('categories')
        .update({ visible: !cat.visible })
        .eq('id', cat.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: () => toast.error('Error al cambiar visibilidad'),
  })

  /* delete */
  const deleteMutation = useMutation({
    mutationFn: async (cat: Category) => {
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', cat.id)
      if (count && count > 0)
        throw new Error(`Esta categoría tiene ${count} producto(s). Reasignálos antes de eliminarla.`)
      const { error } = await supabase.from('categories').delete().eq('id', cat.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoría eliminada')
      setDeleting(null)
    },
    onError: (e: Error) => {
      toast.error(e.message)
      setDeleting(null)
    },
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-stone-100 uppercase tracking-tight">
            Categorías
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            {categories.length} categorías en total
          </p>
        </div>
        <button onClick={openCreate} className={btnPrimary}>
          <Plus size={16} /> Nueva categoría
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl overflow-hidden">
        {isLoading ? (
          <Loader />
        ) : categories.length === 0 ? (
          <Empty text="Aún no hay categorías" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orange-900/15">
                {['Nombre', 'Slug', 'Icono', 'Orden', 'Visible', ''].map((h) => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className={trClass}>
                  <td className={tdClass}>
                    <span className="font-bold text-stone-200">{cat.name}</span>
                  </td>
                  <td className={tdClass}>
                    <code className="text-xs text-stone-500 bg-stone-900/50 px-1.5 py-0.5 rounded">
                      {cat.slug}
                    </code>
                  </td>
                  <td className={tdClass}>
                    <span className="text-xl">{cat.icon ?? '—'}</span>
                  </td>
                  <td className={tdClass}>
                    <span className="text-stone-400">{cat.display_order ?? '—'}</span>
                  </td>
                  <td className={tdClass}>
                    <VisibleBadge
                      visible={cat.visible}
                      onClick={() => toggleMutation.mutate(cat)}
                    />
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-stone-500 hover:text-orange-400 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleting(cat)}
                        className="text-stone-500 hover:text-red-400 transition-colors"
                      >
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

      {/* Create / Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
      >
        <form
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }}
          className="space-y-4"
        >
          <Field label="Nombre *">
            <input
              value={form.name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej: Chocolates"
              className={inputClass}
            />
          </Field>

          <Field label="Slug *">
            <input
              value={form.slug}
              onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value })) }}
              required
              placeholder="ej-chocolates"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Icono (emoji)">
              <input
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="🍫"
                className={inputClass}
              />
            </Field>
            <Field label="Orden de display">
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
                placeholder="1"
                className={inputClass}
                min="0"
              />
            </Field>
          </div>

          <Field label="Visible">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm text-stone-300 font-bold">
                Mostrar en el catálogo público
              </span>
            </label>
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className={`${btnPrimary} flex-1 justify-center`}
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setModal(false)}
              className={btnSecondary}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Eliminar categoría"
        maxWidth="max-w-sm"
      >
        <p className="text-stone-300 text-sm mb-5">
          ¿Eliminás{' '}
          <span className="font-black text-orange-400">{deleting?.name}</span>?
          Esta acción es irreversible.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => deleting && deleteMutation.mutate(deleting)}
            disabled={deleteMutation.isPending}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-2 rounded-xl text-sm uppercase tracking-wide transition-colors"
          >
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </button>
          <button onClick={() => setDeleting(null)} className={btnSecondary}>
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  )
}

/* ── small shared UI ── */

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

function VisibleBadge({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider transition-all ${
        visible
          ? 'bg-green-900/30 text-green-400 border-green-800/40 hover:bg-green-900/50'
          : 'bg-stone-900/50 text-stone-500 border-stone-700/40 hover:bg-stone-900/70'
      }`}
    >
      {visible ? 'Visible' : 'Oculto'}
    </button>
  )
}

function Loader() {
  return (
    <div className="flex justify-center p-12">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <p className="text-center text-stone-600 text-sm font-bold py-12">{text}</p>
  )
}

const thClass =
  'text-left px-5 py-3 text-[11px] font-black text-stone-600 uppercase tracking-widest'
const tdClass = 'px-5 py-3.5'
const trClass = 'border-b border-orange-900/10 hover:bg-white/[0.015] transition-colors'

const inputClass =
  'w-full bg-[#251608] border border-orange-900/25 rounded-xl px-3 py-2.5 ' +
  'text-stone-100 placeholder-stone-700 focus:outline-none focus:border-orange-500/50 text-sm'

const btnPrimary =
  'flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white ' +
  'font-black px-4 py-2 rounded-xl text-sm uppercase tracking-wide transition-colors'

const btnSecondary =
  'flex items-center gap-2 bg-[#251608] hover:bg-[#351a08] text-stone-300 ' +
  'font-bold px-4 py-2 rounded-xl text-sm border border-orange-900/25 transition-colors'
