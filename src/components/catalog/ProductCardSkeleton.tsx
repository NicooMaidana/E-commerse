export default function ProductCardSkeleton() {
  return (
    <div
      className="bg-[#1d1729] border border-[#3a2e4f]/10 rounded-2xl overflow-hidden
        w-44 flex-shrink-0 animate-pulse"
    >
      {/* Image placeholder */}
      <div className="h-36 bg-[#261d36]" />

      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="h-3 bg-stone-800 rounded w-4/5" />
        <div className="h-3 bg-stone-800 rounded w-3/5" />

        <div className="flex items-center justify-between pt-1">
          <div className="h-4 bg-stone-800 rounded w-12" />
          <div className="w-7 h-7 rounded-full bg-stone-800" />
        </div>
      </div>
    </div>
  )
}
