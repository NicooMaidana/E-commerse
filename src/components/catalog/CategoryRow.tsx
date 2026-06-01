import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from './ProductCard'
import { useFadeIn } from '../../hooks/useFadeIn'
import type { CatalogItem } from '../../types'

interface Props {
  categoryName: string
  items: CatalogItem[]
}

export default function CategoryRow({ categoryName, items }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { ref: sectionRef, visible } = useFadeIn<HTMLElement>()

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: dir === 'left' ? -320 : 320,
      behavior: 'smooth',
    })
  }

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLDivElement>}
      className={`mb-12 transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
    >
      {/* Row header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-black text-stone-100 uppercase tracking-widest shrink-0">
          {categoryName}
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-orange-900/40 to-transparent" />
        <button
          onClick={() => scroll('left')}
          className="p-1.5 rounded-full border border-orange-900/30 text-stone-500
            hover:border-orange-500/50 hover:text-orange-400 transition-all"
          aria-label="Desplazar izquierda"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          onClick={() => scroll('right')}
          className="p-1.5 rounded-full border border-orange-900/30 text-stone-500
            hover:border-orange-500/50 hover:text-orange-400 transition-all"
          aria-label="Desplazar derecha"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Scrollable row — py-3 leaves room for the card's hover lift */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto py-3 -my-3 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item) => (
          <ProductCard key={`${item.type}-${item.id}`} item={item} />
        ))}
      </div>
    </section>
  )
}
