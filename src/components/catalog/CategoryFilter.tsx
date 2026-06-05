import type { Category } from '../../types'

interface Props {
  categories: Category[]
  selected: string | null
  onChange: (id: string | null) => void
}

export default function CategoryFilter({ categories, selected, onChange }: Props) {
  return (
    <div
      className="flex gap-5 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Todos */}
      <FilterChip
        initial="★"
        label="Todos"
        active={selected === null}
        onClick={() => onChange(null)}
      />

      {categories.map((cat) => (
        <FilterChip
          key={cat.id}
          initial={cat.name.slice(0, 2).toUpperCase()}
          label={cat.name}
          active={selected === cat.id}
          onClick={() => onChange(cat.id)}
        />
      ))}
    </div>
  )
}

function FilterChip({
  initial,
  label,
  active,
  onClick,
}: {
  initial: string
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center
          text-sm font-black border-2 transition-all duration-200 ${
          active
            ? 'bg-amber-400 border-amber-400 text-[#14101c] shadow-lg shadow-amber-400/25'
            : 'bg-[#1d1729] border-dashed border-[#3a2e4f]/70 text-stone-400 group-hover:border-amber-400/50 group-hover:text-amber-300'
        }`}
      >
        {initial}
      </div>
      <span
        className={`text-[10px] font-black uppercase tracking-wide max-w-[3.5rem]
          text-center leading-tight transition-colors ${
          active ? 'text-amber-300' : 'text-stone-600 group-hover:text-stone-400'
        }`}
      >
        {label}
      </span>
    </button>
  )
}
