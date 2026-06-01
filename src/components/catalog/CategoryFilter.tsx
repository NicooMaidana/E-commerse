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
          initial={cat.name.charAt(0).toUpperCase()}
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
          text-lg font-black border-2 transition-all duration-200 ${
          active
            ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30'
            : 'bg-[#221408] border-orange-900/30 text-stone-400 group-hover:border-orange-500/50 group-hover:text-orange-400'
        }`}
      >
        {initial}
      </div>
      <span
        className={`text-[10px] font-black uppercase tracking-wide max-w-[3.5rem]
          text-center leading-tight transition-colors ${
          active ? 'text-orange-400' : 'text-stone-600 group-hover:text-stone-400'
        }`}
      >
        {label}
      </span>
    </button>
  )
}
