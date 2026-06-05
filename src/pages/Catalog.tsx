import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useCategories, useCatalogItems } from '../hooks/useCatalog'
import CategoryFilter from '../components/catalog/CategoryFilter'
import CategoryRow from '../components/catalog/CategoryRow'
import ProductCardSkeleton from '../components/catalog/ProductCardSkeleton'

/* Skeleton row shown while data loads */
function CategoryRowSkeleton() {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-4 w-28 bg-stone-800/80 rounded animate-pulse" />
        <div className="flex-1 h-px bg-[#3a2e4f]/20" />
      </div>
      <div className="flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

export default function Catalog() {
  const [search, setSearch]       = useState('')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)

  const { data: categories = [], isLoading: loadingCats } = useCategories()
  const { data: allItems   = [], isLoading: loadingItems } = useCatalogItems()

  const loading = loadingCats || loadingItems

  const filtered = search
    ? allItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : allItems

  const rows = categories
    .map((cat) => ({
      category: cat,
      items: filtered.filter((i) => i.category_id === cat.id),
    }))
    .filter(({ items }) => items.length > 0)

  const knownCatIds = new Set(categories.map((c) => c.id))
  const orphaned    = filtered.filter(
    (i) => !i.category_id || !knownCatIds.has(i.category_id)
  )

  const displayedRows = selectedCat
    ? rows.filter(({ category }) => category.id === selectedCat)
    : rows

  const isEmpty = displayedRows.length === 0 && orphaned.length === 0

  return (
    <>
      <Helmet>
        <title>Productos | Alta GULA Delivery</title>
        <meta
          name="description"
          content="Explorá nuestro catálogo de productos y combos. Empanadas, snacks, bebidas y más. Pedí por WhatsApp."
        />
      </Helmet>

      <div className="min-h-screen px-4 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-stone-100 uppercase tracking-tight">
              Nuestros <span className="text-amber-400">productos</span>
            </h1>
            <p className="text-stone-600 text-sm mt-1 font-medium">
              Todo lo que necesitás, en un solo lugar.
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-7">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none"
              size={17}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedCat(null) }}
              placeholder="Buscar productos o combos..."
              className="w-full bg-[#1d1729] border border-[#3a2e4f]/25 rounded-xl
                pl-11 pr-11 py-3 text-stone-100 placeholder-stone-700
                focus:outline-none focus:border-amber-400/50 font-medium text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600
                  hover:text-stone-400 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category filter */}
          {!loading && categories.length > 0 && (
            <div className="mb-9">
              <CategoryFilter
                categories={categories}
                selected={selectedCat}
                onChange={(id) => { setSelectedCat(id); setSearch('') }}
              />
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <CategoryRowSkeleton key={i} />
              ))}
            </>
          )}

          {/* Content */}
          {!loading && (
            <>
              {isEmpty ? (
                <div className="flex flex-col items-center justify-center py-28 gap-4 text-stone-600">
                  <span className="text-6xl select-none">🔍</span>
                  <p className="font-black text-lg text-stone-400">Ningún producto coincide</p>
                  <button
                    onClick={() => { setSearch(''); setSelectedCat(null) }}
                    className="text-amber-300 hover:text-amber-200 font-bold text-sm
                      underline underline-offset-4 transition-colors"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <>
                  {displayedRows.map(({ category, items }) => (
                    <CategoryRow
                      key={category.id}
                      categoryName={category.name}
                      items={items}
                    />
                  ))}
                  {orphaned.length > 0 && !selectedCat && (
                    <CategoryRow categoryName="Otros" items={orphaned} />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
