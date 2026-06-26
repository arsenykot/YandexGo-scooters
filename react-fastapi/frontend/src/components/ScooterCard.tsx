import { BatteryBar } from './BatteryBar'
import './ScooterCard.css'

const SCOOTER_IMG = '/media/scooter.png'

interface ScooterCardProps {
  number: string
  battery: number
  rangeHours: number
  walkMin?: number
}

export function ScooterCard({ number, battery, rangeHours, walkMin }: ScooterCardProps) {
  return (
    <div className="scooter-card">
      <div className="scooter-card__main">
        <div className="scooter-card__id-row">
          <h2 className="scooter-number">{number}</h2>
          {walkMin != null && (
            <span className="scooter-walk">{walkMin} min walk</span>
          )}
        </div>
        <div className="scooter-meta">
          <span className="badge badge-range">~{rangeHours} h range</span>
        </div>
        <BatteryBar percent={battery} />
      </div>
      <div className="scooter-card__photo">
        <img src={SCOOTER_IMG} alt={`Yandex Go scooter ${number}`} />
      </div>
    </div>
  )
}
