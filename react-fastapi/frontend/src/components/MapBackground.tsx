import type { ScooterSummary } from '../types'
import { ZONE } from '../constants'
import './MapBackground.css'

interface MapBackgroundProps {
  scooters?: ScooterSummary[]
  onMarkerClick?: (number: string) => void
  highlightNumber?: string
  rentedNumbers?: string[]
  showUserDot?: boolean
  userPosition?: { lat_pct: number; lng_pct: number }
  rentedCount?: number
  /** fleet = all free scooters; focus = rented scooters (+ current if not rented) */
  mode?: 'fleet' | 'focus'
}

export function MapBackground({
  scooters = [],
  onMarkerClick,
  highlightNumber,
  rentedNumbers = [],
  showUserDot = false,
  userPosition,
  rentedCount,
  mode = 'fleet',
}: MapBackgroundProps) {
  const rentedSet = new Set(rentedNumbers.map((n) => n.toUpperCase()))
  const visible =
    mode === 'focus' ? scooters : scooters.filter((s) => s.available)
  const availableCount =
    mode === 'fleet' ? scooters.filter((s) => s.available).length : visible.length
  const focusRentedCount = rentedCount ?? rentedSet.size

  const dotLeft = userPosition ? `${userPosition.lng_pct}%` : '50%'
  const dotTop = userPosition ? `${userPosition.lat_pct}%` : '52%'

  return (
    <div className="map-background">
      <div className="map-placeholder" aria-hidden />
      <div className="map-vignette" aria-hidden />
      <div className="map-chrome">
        <div className="map-zone-chip">
          <span className="map-zone-chip__dot" />
          {ZONE.name}
        </div>
        {mode === 'fleet' ? (
          <div className="map-fleet-chip">{availableCount} free</div>
        ) : (
          <div className="map-fleet-chip map-fleet-chip--focus">
            {focusRentedCount > 0
              ? `${focusRentedCount} rented`
              : highlightNumber ?? 'Selected'}
            {highlightNumber && focusRentedCount > 0 ? ` · ${highlightNumber}` : ''}
          </div>
        )}
      </div>
      {showUserDot && (
        <div
          className="user-location user-location--live"
          style={{ left: dotLeft, top: dotTop }}
        >
          <span className="user-dot" />
          <span className="user-pulse" />
        </div>
      )}
      {visible.map((s) => {
        const isHighlight = highlightNumber === s.number
        const isRented = rentedSet.has(s.number)
        const variant = isHighlight ? 'current' : isRented ? 'rented' : 'free'

        return (
          <button
            key={s.id}
            type="button"
            className={`scooter-marker scooter-marker--enter scooter-marker--${variant} ${isHighlight ? 'highlight' : ''}`}
            style={{ left: `${s.lng_pct}%`, top: `${s.lat_pct}%` }}
            onClick={() => onMarkerClick?.(s.number)}
            aria-label={`Scooter ${s.number}, ${s.battery}% battery`}
          >
            {isHighlight && <span className="marker-ring" />}
            <span className="marker-icon">
              <img src="/icons/scooter.svg" alt="" />
            </span>
            <span className="marker-pin" />
            <span className="marker-label">{s.number}</span>
          </button>
        )
      })}
    </div>
  )
}
