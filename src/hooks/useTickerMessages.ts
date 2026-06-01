import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { TickerMessage } from '../types'

export function useTickerMessages() {
  return useQuery<TickerMessage[]>({
    queryKey: ['ticker_messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticker_messages')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}
