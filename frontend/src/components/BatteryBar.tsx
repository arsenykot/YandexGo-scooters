import './BatteryBar.css'

interface BatteryBarProps {
  percent: number
  compact?: boolean
}

export function BatteryBar({ percent, compact }: BatteryBarProps) {
  const tone =
    percent >= 60 ? 'high' : percent >= 30 ? 'mid' : 'low'

  return (
    <div className={`battery-bar ${compact ? 'battery-bar--compact' : ''}`}>
      <div className="battery-bar__track">
        <div
          className={`battery-bar__fill battery-bar__fill--${tone}`}
          style={{ width: `${Math.max(4, percent)}%` }}
        />
      </div>
      {!compact && <span className="battery-bar__label">{percent}% charge</span>}
    </div>
  )
}
