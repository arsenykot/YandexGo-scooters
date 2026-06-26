import { ChevronRight, Battery } from 'lucide-react'
import type { ScooterSummary } from '../types'
import { walkMinutesFromCenter, batteryTone } from '../utils'
import './NearbyScooterList.css'

interface NearbyScooterListProps {
  scooters: ScooterSummary[]
  onSelect: (number: string) => void
  loading?: boolean
}

export function NearbyScooterList({ scooters, onSelect, loading }: NearbyScooterListProps) {
  if (loading) {
    return (
      <div className="nearby-list">
        {[1, 2, 3].map((i) => (
          <div key={i} className="nearby-item nearby-item--skeleton" />
        ))}
      </div>
    )
  }

  const available = scooters.filter((s) => s.available)

  return (
    <div className="nearby-list">
      <div className="nearby-list__header">
        <h3>Nearby</h3>
        <span className="nearby-count">{available.length} available</span>
      </div>
      {available.length === 0 ? (
        <p className="nearby-empty">All scooters are currently in use</p>
      ) : (
        available.map((s) => {
          const walk = walkMinutesFromCenter(s.lat_pct, s.lng_pct)
          const tone = batteryTone(s.battery)
          return (
            <button
              key={s.id}
              type="button"
              className="nearby-item"
              onClick={() => onSelect(s.number)}
            >
              <span className="nearby-item__icon">
                <img src="/icons/scooter.svg" alt="" />
              </span>
              <span className="nearby-item__body">
                <span className="nearby-item__number">{s.number}</span>
                <span className="nearby-item__meta">
                  {walk} min ·{' '}
                  <Battery size={12} className={`nearby-battery nearby-battery--${tone}`} />
                  {s.battery}%
                </span>
              </span>
              <ChevronRight size={18} className="nearby-item__chevron" />
            </button>
          )
        })
      )}
    </div>
  )
}
