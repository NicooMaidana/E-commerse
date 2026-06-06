import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Settings } from '../types'

export function useSettings() {
  return useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('*')
      if (error) throw error
      const map: Record<string, string> = {}
      for (const row of data ?? []) map[row.key] = row.value ?? ''
      return {
        whatsapp_number:
          map.whatsapp_number ||
          (import.meta.env.VITE_WHATSAPP_NUMBER as string) ||
          '',
        delivery_cost:  map.delivery_cost ?? '',
        min_order:      map.min_order ?? '',
        order_message:  map.order_message ?? '',
        instagram_url:  map.instagram_url ?? '',
        facebook_url:   map.facebook_url ?? '',
      }
    },
  })
}
