import { type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center
        bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`relative bg-[#1a1008] border border-orange-900/30
          rounded-2xl w-full ${maxWidth} my-8 shadow-2xl`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-orange-900/20">
          <h3 className="font-black text-orange-400 uppercase tracking-widest text-xs">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-stone-600 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
