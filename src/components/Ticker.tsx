import { useTickerMessages } from '../hooks/useTickerMessages'

export default function Ticker() {
  const { data: messages } = useTickerMessages()

  if (!messages?.length) return null

  const text = messages.map((m) => m.content).join('   ★   ')
  // Repeat 4× so short messages still loop seamlessly on wide screens
  const content = Array(4).fill(text).join('   ★   ') + '   ★   '

  return (
    <div className="bg-orange-500 overflow-hidden py-2.5 select-none">
      <div className="ticker-track whitespace-nowrap" style={{ display: 'inline-block' }}>
        <span className="text-white font-black text-sm tracking-wide">
          {content}{content}
        </span>
      </div>
    </div>
  )
}
