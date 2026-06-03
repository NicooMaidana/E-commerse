export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  display_order: number | null
  visible: boolean
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  category_id: string | null
  price: number
  stock: number
  images: string[]
  visible: boolean
  created_at: string
}

export interface ComboItem {
  id: string
  combo_id: string
  product_id: string
  quantity: number
  products: Pick<Product, 'id' | 'name'>
}

export interface Combo {
  id: string
  name: string
  description: string | null
  category_id: string | null
  price: number
  images: string[]
  visible: boolean
  created_at: string
  combo_items: ComboItem[]
}

export interface TickerMessage {
  id: string
  content: string
  display_order: number | null
  active: boolean
}

export interface Settings {
  whatsapp_number: string
  delivery_cost: string
  min_order: string
  store_name: string
}

export interface CartItem {
  id: string
  type: 'product' | 'combo'
  name: string
  price: number
  quantity: number
  image?: string
  components?: string
}

export interface CatalogItem {
  id: string
  type: 'product' | 'combo'
  name: string
  description: string | null
  category_id: string | null
  price: number
  image?: string
  inStock: boolean
  components?: string
}

export interface Order {
  id: string
  reference: string
  customer_name: string
  delivery_type: 'delivery' | 'pickup'
  address: string | null
  comment: string | null
  payment_method: 'efectivo' | 'transferencia'
  subtotal: number
  delivery_cost: number
  total: number
  status: 'pending' | 'confirmed' | 'cancelled'
  source: string
  created_at: string
  confirmed_at: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  combo_id: string | null
  item_name: string
  unit_price: number
  quantity: number
  line_total: number
}
