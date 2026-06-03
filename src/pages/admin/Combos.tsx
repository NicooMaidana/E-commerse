import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, X, ImageOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import type { Category, Combo, Product } from '../../types'

type ComboRow = Combo & { categories: Pick<Category, 'id' | 'name'> | null }

interface ComboItemForm {
  product_id: string
  product_name: string
  price: number
  quantity: number
}

interface FormState {
  name: string
  description: string
  category_id: string
  price: string
  visible: boolean
}

const EMPTY: FormState = {
  name: '', description: '', category_id: '', price: '', visible: true,
}

const fmt = (n: number) => n.toLocaleString('es-AR')

/* ── component ── */

export default function AdminCombos() {
  const qc = useQueryClient()

  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState<ComboRow | null>(null)
  const [form, setForm]         = useState<FormState>(EMPTY)
  const [comboItems, setComboItems] = useState<ComboItemForm[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [deleting, setDeleting] = useState<ComboRow | null>(null)
  const [imageFile, setImageFile]   = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /* queries */
  const { data: combos = [], isLoading } = useQuery<ComboRow[]>({
    queryKey: ['admin', 'combos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('combos')
        .select('*, categories(id, name), combo_items(id, quantity, product_id, products(id, name))')
        .order('name')
      if (error) throw error
      return (data ?? []) as ComboRow[]
    },
  })

  const { data: allProducts = [] } = useQuery<Product[]>({
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

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('display_order')
      if (error) throw error
      return data ?? []
    },
  })

  /* open modal */
  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setComboItems([])
    setProductSearch('')
    setImageFile(null)
    setPreviewUrl(null)
    setModal(true)
  }

  const openEdit = (c: ComboRow) => {
    setEditing(c)
    setForm({
      name:        c.name,
      description: c.description ?? '',
      category_id: c.category_id ?? '',
      price:       String(c.price),
      visible:     c.visible,
    })
    setComboItems(
      (c.combo_items ?? []).map((ci) => ({
        product_id:   ci.product_id,
        product_name: ci.products?.name ?? '?',
        price:        allProducts.find((p) => p.id === ci.product_id)?.price ?? 0,
        quantity:     ci.quantity,
      }))
    )
    setProductSearch('')
    setImageFile(null)
    setPreviewUrl(c.images?.[0] ?? null)
    setModal(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : (editing?.images?.[0] ?? null))
  }

  /* combo item helpers */
  const addProduct = (p: Product) => {
    setComboItems((prev) => {
      if (prev.find((i) => i.product_id === p.id)) {
        return prev.map((i) =>
          i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { product_id: p.id, product_name: p.name, price: p.price, quantity: 1 }]
    })
    setProductSearch('')
  }

  const removeItem = (product_id: string) =>
    setComboItems((prev) => prev.filter((i) => i.product_id !== product_id))

  const setQty = (product_id: string, q: number) =>
    setComboItems((prev) =>
      prev.map((i) => (i.product_id === product_id ? { ...i, quantity: Math.max(1, q) } : i))
    )

  /* filtered product search */
  const searchResults = productSearch
    ? allProducts
        .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
        .slice(0, 6)
    : []

  /* save */
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (comboItems.length === 0) throw new Error('Agregá al menos un producto al combo')

      // Use a stable ID so we can reference it for image path and insert
      const comboId = editing?.id ?? crypto.randomUUID()
      let images: string[] = editing?.images ?? []

      if (imageFile) {
        const ext  = imageFile.name.split('.').pop() ?? 'jpg'
        const path = `combos/${comboId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('product-images')
          .upload(path, imageFile, { upsert: true })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(path)
        images = [publicUrl]
      }

      const payload = {
        name:        form.name.trim(),
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        price:       parseFloat(form.price) || 0,
        visible:     form.visible,
        images,
      }

      if (editing) {
        const { error } = await supabase.from('combos').update(payload).eq('id', comboId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('combos').insert({ id: comboId, ...payload })
        if (error) throw error
      }

      // Sync combo_items: delete all, re-insert
      const { error: delErr } = await supabase.from('combo_items').delete().eq('combo_id', comboId)
      if (delErr) throw delErr

      const { error: insErr } = await supabase.from('combo_items').insert(
        comboItems.map((ci) => ({
          combo_id:   comboId,
          product_id: ci.product_id,
          quantity:   ci.quantity,
        }))
      )
      if (insErr) throw insErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'combos'] })
      qc.invalidateQueries({ queryKey: ['catalog_items'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success(editing ? 'Combo actualizado' : 'Combo creado')
      setModal(false)
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar'),
  })

  /* toggle */
  const toggleMutation = useMutation({
    mutationFn: async (c: ComboRow) => {
      const { error } = await supabase.from('combos').update({ visible: !c.visible }).eq('id', c.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'combos'] })
      qc.invalidateQueries({ queryKey: ['catalog_items'] })
    },
    onError: () => toast.error('Error'),
  })

  /* delete */
  const deleteMutation = useMutation({
    mutationFn: async (c: ComboRow) => {
      const { error } = await supabase.from('combos').delete().eq('id', c.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'combos'] })
      qc.invalidateQueries({ queryKey: ['catalog_items'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('Combo eliminado')
      setDeleting(null)
    },
    onError: () => { toast.error('Error al eliminar'); setDeleting(null) },
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-stone-100 uppercase tracking-tight">
            Combos
          </h1>
          <p className="text-stone-600 text-sm mt-1">{combos.length} combos en total</p>
        </div>
        <button onClick={openCreate} className={btnPrimary}>
          <Plus size={16} /> Nuevo combo
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl overflow-hidden">
        {isLoading ? <Loader /> : combos.length === 0 ? <Empty text="Sin combos aún" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-orange-900/15">
                {['', 'Nombre', 'Categoría', 'Precio', 'Productos', 'Visible', ''].map((h) => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {combos.map((c) => (
                <tr key={c.id} className={trClass}>
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#2d1a09] shrink-0">
                      {c.images?.[0] ? (
                        <img src={c.images[0]} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff size={14} className="text-stone-700" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-stone-200">{c.name}</td>
                  <td className="px-5 py-3.5 text-stone-500 text-xs">
                    {c.categories?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 font-black text-orange-400">
                    ${fmt(c.price)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-stone-500 text-xs">
                      {c.combo_items?.length ?? 0} producto(s)
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <VisibleBadge visible={c.visible} onClick={() => toggleMutation.mutate(c)} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(c)} className="text-stone-500 hover:text-orange-400 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeleting(c)} className="text-stone-500 hover:text-red-400 transition-colors">
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

      {/* Create/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Editar combo' : 'Nuevo combo'}
        maxWidth="max-w-2xl"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }}
          className="space-y-4"
        >
          {/* Basic info */}
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Nombre *">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Combo Empanadas"
                className={inputClass}
              />
            </Field>
            <Field label="Categoría">
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Descripción">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Descripción del combo..."
              className={`${inputClass} resize-none`}
            />
          </Field>

          <Field label="Foto">
            <div
              className="border-2 border-dashed border-orange-900/30 rounded-xl overflow-hidden
                cursor-pointer hover:border-orange-500/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className="w-full h-40 object-cover" />
              ) : (
                <div className="h-40 flex flex-col items-center justify-center gap-2 text-stone-600">
                  <ImageOff size={28} strokeWidth={1.5} />
                  <p className="text-xs font-bold">Hacé click para subir una foto</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {previewUrl && (
              <button
                type="button"
                onClick={() => { setImageFile(null); setPreviewUrl(null) }}
                className="text-xs text-red-400 hover:text-red-300 font-bold transition-colors mt-1"
              >
                Quitar foto
              </button>
            )}
          </Field>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Precio ($) *">
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required
                min="0"
                placeholder="3500"
                className={inputClass}
              />
            </Field>
            <Field label="Visible">
              <label className="flex items-center gap-3 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={form.visible}
                  onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-stone-300 font-bold">Mostrar en catálogo</span>
              </label>
            </Field>
          </div>

          {/* Product selector */}
          <div className="border-t border-orange-900/20 pt-4 space-y-3">
            <label className="block text-[11px] font-black text-stone-500 uppercase tracking-widest">
              Productos del combo *
            </label>

            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none" />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar y agregar productos..."
                className={`${inputClass} pl-9`}
              />
            </div>

            {/* Results dropdown */}
            {searchResults.length > 0 && (
              <div className="bg-[#0f0904] border border-orange-900/25 rounded-xl overflow-hidden">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm
                      hover:bg-orange-500/10 transition-colors text-left border-b border-orange-900/10 last:border-0"
                  >
                    <span className="font-bold text-stone-200">{p.name}</span>
                    <span className="text-orange-400 font-black text-xs">${fmt(p.price)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected items */}
            {comboItems.length > 0 ? (
              <div className="space-y-2">
                {comboItems.map((ci) => (
                  <div
                    key={ci.product_id}
                    className="flex items-center gap-3 bg-[#251608] border border-orange-900/20
                      rounded-xl px-3 py-2.5"
                  >
                    <span className="flex-1 text-sm font-bold text-stone-200 truncate">
                      {ci.product_name}
                    </span>
                    <span className="text-xs text-orange-400 font-black shrink-0">
                      ${fmt(ci.price)}
                    </span>
                    <input
                      type="number"
                      value={ci.quantity}
                      onChange={(e) => setQty(ci.product_id, parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-14 bg-[#1a1008] border border-orange-900/25 rounded-lg
                        px-2 py-1 text-sm text-center text-stone-100 focus:outline-none
                        focus:border-orange-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(ci.product_id)}
                      className="text-stone-600 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="text-right text-xs text-stone-600 font-bold pt-1">
                  {comboItems.reduce((s, ci) => s + ci.quantity, 0)} unidades ·{' '}
                  Precio sugerido: ${fmt(comboItems.reduce((s, ci) => s + ci.price * ci.quantity, 0))}
                </div>
              </div>
            ) : (
              <p className="text-center text-stone-700 text-xs font-bold py-4">
                Buscá y agregá productos
              </p>
            )}
          </div>

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
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Eliminar combo" maxWidth="max-w-sm">
        <p className="text-stone-300 text-sm mb-5">
          ¿Eliminás <span className="font-black text-orange-400">{deleting?.name}</span>?
        </p>
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

/* ── shared UI ── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-black text-stone-500 uppercase tracking-widest">{label}</label>
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
  return <div className="flex justify-center p-12"><div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" /></div>
}

function Empty({ text }: { text: string }) {
  return <p className="text-center text-stone-600 text-sm font-bold py-12">{text}</p>
}

const thClass = 'text-left px-5 py-3 text-[11px] font-black text-stone-600 uppercase tracking-widest'
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
