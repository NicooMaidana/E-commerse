import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ImageOff, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/ui/Modal'
import type { Category, Product } from '../../types'

type ProductRow = Product & { categories: Pick<Category, 'id' | 'name'> | null }

interface FormState {
  name: string
  description: string
  category_id: string
  price: string
  stock: string
  visible: boolean
}

const EMPTY: FormState = {
  name: '', description: '', category_id: '', price: '', stock: '0', visible: true,
}

const fmt = (n: number) => n.toLocaleString('es-AR')

/* ── hooks ── */

function useAdminProducts() {
  return useQuery<ProductRow[]>({
    queryKey: ['admin', 'products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name)')
        .order('name')
      if (error) throw error
      return (data ?? []) as ProductRow[]
    },
  })
}

function useAdminCategories() {
  return useQuery<Category[]>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order')
      if (error) throw error
      return data ?? []
    },
  })
}

/* ── main component ── */

export default function AdminProducts() {
  const qc = useQueryClient()
  const { data: products = [], isLoading } = useAdminProducts()
  const { data: categories = [] } = useAdminCategories()

  const [search, setSearch]     = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState<ProductRow | null>(null)
  const [form, setForm]         = useState<FormState>(EMPTY)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ProductRow | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /* filtered list */
  const displayed = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat    = !filterCat || p.category_id === filterCat
    return matchSearch && matchCat
  })

  /* open modal */
  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setImageFile(null)
    setPreviewUrl(null)
    setModal(true)
  }

  const openEdit = (p: ProductRow) => {
    setEditing(p)
    setForm({
      name:        p.name,
      description: p.description ?? '',
      category_id: p.category_id ?? '',
      price:       String(p.price),
      stock:       String(p.stock),
      visible:     p.visible,
    })
    setImageFile(null)
    setPreviewUrl(p.images?.[0] ?? null)
    setModal(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setImageFile(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : (editing?.images?.[0] ?? null))
  }

  /* save mutation */
  const saveMutation = useMutation({
    mutationFn: async () => {
      const productId = editing?.id ?? crypto.randomUUID()

      let images: string[] = editing?.images ?? []

      if (imageFile) {
        const ext  = imageFile.name.split('.').pop() ?? 'jpg'
        const path = `${productId}/${Date.now()}.${ext}`
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
        id:          productId,
        name:        form.name.trim(),
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        price:       parseFloat(form.price) || 0,
        stock:       parseInt(form.stock) || 0,
        images,
        visible:     form.visible,
      }

      const { error } = await supabase.from('products').upsert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['catalog_items'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success(editing ? 'Producto actualizado' : 'Producto creado')
      setModal(false)
    },
    onError: (e: Error) => toast.error(e.message || 'Error al guardar'),
  })

  /* delete mutation */
  const deleteMutation = useMutation({
    mutationFn: async (p: ProductRow) => {
      const { error } = await supabase.from('products').delete().eq('id', p.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['catalog_items'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('Producto eliminado')
      setDeleting(null)
    },
    onError: () => { toast.error('Error al eliminar'); setDeleting(null) },
  })

  /* toggle visible */
  const toggleMutation = useMutation({
    mutationFn: async (p: ProductRow) => {
      const { error } = await supabase.from('products').update({ visible: !p.visible }).eq('id', p.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['catalog_items'] })
    },
    onError: () => toast.error('Error'),
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-stone-100 uppercase tracking-tight">
            Productos
          </h1>
          <p className="text-stone-600 text-sm mt-1">{products.length} productos en total</p>
        </div>
        <button onClick={openCreate} className={btnPrimary}>
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className={inputClass}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1008] border border-orange-900/20 rounded-2xl overflow-hidden">
        {isLoading ? <Loader /> : displayed.length === 0 ? (
          <Empty text="Sin productos que coincidan" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-orange-900/15">
                  {['', 'Nombre', 'Categoría', 'Precio', 'Stock', 'Visible', ''].map((h) => (
                    <th key={h} className={thClass}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((p) => (
                  <tr key={p.id} className={trClass}>
                    {/* Thumbnail */}
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg bg-[#2a1608] overflow-hidden shrink-0">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageOff size={14} className="text-stone-700" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-stone-200 max-w-[200px]">
                      <span className="truncate block">{p.name}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {p.categories?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-black text-orange-400">
                      ${fmt(p.price)}
                    </td>
                    <td className="px-4 py-3">
                      <StockInput product={p} />
                    </td>
                    <td className="px-4 py-3">
                      <VisibleBadge
                        visible={p.visible}
                        onClick={() => toggleMutation.mutate(p)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-stone-500 hover:text-orange-400 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleting(p)}
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
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        maxWidth="max-w-2xl"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }}
          className="space-y-4"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Field label="Nombre *">
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Empanada de Carne"
                  className={inputClass}
                />
              </Field>

              <Field label="Descripción">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Descripción del producto..."
                  rows={3}
                  className={`${inputClass} resize-none`}
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

              <div className="grid grid-cols-2 gap-3">
                <Field label="Precio ($) *">
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    required
                    min="0"
                    step="0.01"
                    placeholder="500"
                    className={inputClass}
                  />
                </Field>
                <Field label="Stock *">
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    required
                    min="0"
                    className={inputClass}
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
                    Mostrar en catálogo
                  </span>
                </label>
              </Field>
            </div>

            {/* Image column */}
            <div className="space-y-3">
              <label className="block text-[11px] font-black text-stone-500 uppercase tracking-widest">
                Imagen
              </label>
              <div
                className="aspect-square bg-[#251608] border-2 border-dashed border-orange-900/30
                  rounded-xl flex items-center justify-center overflow-hidden cursor-pointer
                  hover:border-orange-500/40 transition-colors relative"
                onClick={() => fileRef.current?.click()}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-stone-600 p-4">
                    <ImageOff size={32} className="mx-auto mb-2" />
                    <p className="text-xs font-bold">Click para subir imagen</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
              />
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setPreviewUrl(null) }}
                  className="text-xs text-stone-600 hover:text-red-400 transition-colors font-bold"
                >
                  Quitar imagen
                </button>
              )}
              <p className="text-[11px] text-stone-700">
                Bucket: <code>product-images</code> (debe ser público en Supabase).
              </p>
            </div>
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
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Eliminar producto" maxWidth="max-w-sm">
        <p className="text-stone-300 text-sm mb-5">
          ¿Eliminás{' '}
          <span className="font-black text-orange-400">{deleting?.name}</span>?
          Esto también lo removerá de cualquier combo.
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

/* ── inline stock input ── */

function StockInput({ product }: { product: ProductRow }) {
  const qc = useQueryClient()
  const [val, setVal] = useState(String(product.stock))

  const mutation = useMutation({
    mutationFn: async (n: number) => {
      const { error } = await supabase.from('products').update({ stock: n }).eq('id', product.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] })
      qc.invalidateQueries({ queryKey: ['catalog_items'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: () => { toast.error('Error al actualizar stock'); setVal(String(product.stock)) },
  })

  const save = () => {
    const n = parseInt(val, 10)
    if (isNaN(n) || n === product.stock) { setVal(String(product.stock)); return }
    mutation.mutate(n)
  }

  return (
    <input
      type="number"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === 'Enter' && save()}
      min="0"
      className={`w-16 bg-[#251608] border rounded-lg px-2 py-1 text-sm text-center
        focus:outline-none transition-colors ${
        product.stock === 0
          ? 'border-red-800/50 text-red-400'
          : product.stock <= 5
          ? 'border-yellow-800/50 text-yellow-400'
          : 'border-orange-900/25 text-stone-200'
      } focus:border-orange-500/50`}
    />
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
  return <p className="text-center text-stone-600 text-sm font-bold py-12">{text}</p>
}

const thClass = 'text-left px-4 py-3 text-[11px] font-black text-stone-600 uppercase tracking-widest'
const tdClass = 'px-4 py-3'
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

// suppress unused warning
void tdClass
