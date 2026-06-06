import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../hooks/useSettings'

interface FormState {
  whatsapp_number: string
  delivery_cost: string
  min_order: string
  order_message: string
}

const EMPTY: FormState = {
  whatsapp_number: '',
  delivery_cost: '',
  min_order: '',
  order_message: '',
}

export default function AdminSettings() {
  const qc = useQueryClient()
  const { data: settings, isLoading } = useSettings()
  const [form, setForm] = useState<FormState>(EMPTY)

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(form) as [string, string][]
      const { error } = await supabase
        .from('settings')
        .upsert(entries.map(([key, value]) => ({ key, value })), { onConflict: 'key' })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Configuración guardada')
    },
    onError: () => toast.error('Error al guardar'),
  })

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-100 uppercase tracking-tight">
          Configuración
        </h1>
        <p className="text-stone-600 text-sm mt-1">
          Parámetros generales del negocio.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        </div>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }}
          className="bg-[#1d1729] border border-[#3a2e4f]/20 rounded-2xl p-6 space-y-5"
        >
          <Field
            label="Número de WhatsApp"
            hint="Formato internacional sin + ni espacios: 549XXXXXXXXXX"
          >
            <input
              value={form.whatsapp_number}
              onChange={set('whatsapp_number')}
              placeholder="5491112345678"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Costo de delivery ($)" hint="Dejar vacío si varía">
              <input
                type="number"
                value={form.delivery_cost}
                onChange={set('delivery_cost')}
                placeholder="1500"
                className={inputClass}
                min="0"
              />
            </Field>

            <Field label="Pedido mínimo ($)" hint="Dejar vacío para sin mínimo">
              <input
                type="number"
                value={form.min_order}
                onChange={set('min_order')}
                placeholder="1000"
                className={inputClass}
                min="0"
              />
            </Field>
          </div>

          <Field
            label="Mensaje predeterminado del pedido"
            hint="Aparece al inicio del mensaje de WhatsApp enviado al negocio"
          >
            <textarea
              value={form.order_message}
              onChange={set('order_message')}
              placeholder="Hola! Quiero hacer el siguiente pedido:"
              rows={3}
              className={inputClass + ' resize-none'}
            />
          </Field>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300
                text-[#14101c] font-black px-6 py-3 rounded-xl text-sm uppercase
                tracking-widest transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {saveMutation.isPending ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-black text-stone-500 uppercase tracking-widest">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-stone-700">{hint}</p>}
    </div>
  )
}

const inputClass =
  'w-full bg-[#261d36] border border-[#3a2e4f]/25 rounded-xl px-3 py-2.5 ' +
  'text-stone-100 placeholder-stone-700 focus:outline-none focus:border-amber-400/50 text-sm'
