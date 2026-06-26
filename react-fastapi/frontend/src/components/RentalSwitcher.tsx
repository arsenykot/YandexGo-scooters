import type { Session } from '../types'
import { isRented } from '../types'
import { formatCost, formatTimer } from '../utils'
import './RentalSwitcher.css'

interface RentalSwitcherProps {
  sessions: Session[]
  currentNumber: string
  onSelect: (number: string) => void
}

const STATUS_SHORT: Record<Session['status'], string> = {
  selected: 'Selected',
  reserved: 'Reserved',
  riding: 'Riding',
  paused: 'Paused',
  finish_photo: 'Photo',
}

export function RentalSwitcher({ sessions, currentNumber, onSelect }: RentalSwitcherProps) {
  const active = sessions.filter(
    (s) => isRented(s.status) || s.status === 'finish_photo',
  )
  if (active.length <= 1) return null

  return (
    <div className="rental-switcher" role="tablist" aria-label="Active rentals">
      {active.map((session) => {
        const isCurrent = session.scooter_number === currentNumber.toUpperCase()
        const timer =
          session.status === 'riding'
            ? formatTimer(session.riding_seconds ?? session.elapsed_seconds)
            : session.status === 'paused'
              ? formatTimer(session.waiting_session_seconds ?? 0)
              : null

        return (
          <button
            key={session.scooter_id}
            type="button"
            role="tab"
            aria-selected={isCurrent}
            className={`rental-switcher__chip ${isCurrent ? 'rental-switcher__chip--active' : ''} rental-switcher__chip--${session.status}`}
            onClick={() => onSelect(session.scooter_number)}
          >
            <span className="rental-switcher__number">{session.scooter_number}</span>
            <span className="rental-switcher__meta">
              {STATUS_SHORT[session.status]}
              {timer ? ` · ${timer}` : ''}
              {session.cost_rub > 0 ? ` · ${formatCost(session.cost_rub)}` : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}
