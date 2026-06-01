import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Category, CatalogItem, Combo } from '../types'

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('visible', true)
        .order('display_order', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCatalogItems() {
  return useQuery<CatalogItem[]>({
    queryKey: ['catalog_items'],
    queryFn: async () => {
      const [productsRes, combosRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('visible', true)
          .gt('stock', 0)
          .order('name'),
        supabase
          .from('combos')
          .select('*, combo_items(id, quantity, product_id, products(id, name))')
          .eq('visible', true)
          .order('name'),
      ])

      if (productsRes.error) throw productsRes.error
      if (combosRes.error) throw combosRes.error

      const products: CatalogItem[] = (productsRes.data ?? []).map((p) => ({
        id: p.id,
        type: 'product' as const,
        name: p.name,
        description: p.description,
        category_id: p.category_id,
        price: p.price,
        image: p.images?.[0],
        inStock: true,
      }))

      const combos: CatalogItem[] = ((combosRes.data as unknown as Combo[]) ?? []).map(
        (c) => {
          const components =
            c.combo_items
              ?.map((ci) => `${ci.quantity}x ${ci.products?.name ?? '?'}`)
              .join(', ') ?? ''
          return {
            id: c.id,
            type: 'combo' as const,
            name: c.name,
            description: c.description,
            category_id: c.category_id,
            price: c.price,
            inStock: true,
            components: components || undefined,
          }
        }
      )

      return [...products, ...combos]
    },
  })
}
