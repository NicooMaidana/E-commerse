import { useTickerMessages } from '../hooks/useTickerMessages'

export default function Ticker() {
  const { data: messages } = useTickerMessages()

  if (!messages?.length) return null

  // Non-breaking spaces ensure the separator gap isn't collapsed by the browser
  const SEP = '      ·      '
  const text = messages.map((m) => m.content).join(SEP)
  // Repeat 4× so short messages still loop seamlessly on wide screens
  const content = Array(4).fill(text).join(SEP) + SEP

  return (
    <div
      className="overflow-hidden py-3 select-none"
      style={{
        background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 40%, #fcd34d 60%, #fbbf24 80%, #f59e0b 100%)',
      }}
    >
      <div className="ticker-track whitespace-nowrap" style={{ display: 'inline-block' }}>
        <span className="text-[#1a1208] font-black text-sm tracking-wide">
          {content}{content}
        </span>
      </div>
    </div>
  )
}
