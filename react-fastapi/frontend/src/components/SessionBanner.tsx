import { ChevronRight } from 'lucide-react'
import type { Session } from '../types'
import { isRented } from '../types'
import { formatCost, formatTimer, formatFreeWait } from '../utils'
import './SessionBanner.css'

interface ActiveRentalsProps {
  sessions: Session[]
  onContinue: (number: string) => void
}

export function ActiveRentals({ sessions, onContinue }: ActiveRentalsProps) {
  const active = sessions.filter(
    (s) => isRented(s.status) || s.status === 'finish_photo',
  )
  if (active.length === 0) return null

  const totalCost = active.reduce((sum, s) => sum + s.cost_rub, 0)

  return (
    <div className="active-rentals">
      <div className="active-rentals__header">
        <span className="active-rentals__label">Your rentals · {active.length}</span>
        {totalCost > 0 && (
          <span className="active-rentals__total">{formatCost(totalCost)} total</span>
        )}
      </div>
      {active.map((session) => (
        <SessionBanner
          key={session.scooter_id}
          session={session}
          onContinue={() => onContinue(session.scooter_number)}
        />
      ))}
    </div>
  )
}

interface SessionBannerProps {
  session: Session
  onContinue: () => void
}

export function SessionBanner({ session, onContinue }: SessionBannerProps) {
  const labels: Record<Session['status'], string> = {
    selected: 'Scooter selected',
    reserved: 'Reserved',
    riding: 'Ride in progress',
    paused: 'Waiting',
    finish_photo: 'Take a parking photo',
  }

  const riding = session.riding_seconds ?? session.elapsed_seconds
  const waitingSession = session.waiting_session_seconds ?? 0

  let detail = session.scooter_number
  if (session.status === 'reserved' && session.free_wait_remaining_seconds != null) {
    detail = `${session.scooter_number} · Free wait ${formatFreeWait(session.free_wait_remaining_seconds)}`
  } else if (session.status === 'riding') {
    detail = `${session.scooter_number} · Riding ${formatTimer(riding)} · ${formatCost(session.cost_rub)}`
  } else if (session.status === 'paused') {
    detail = `${session.scooter_number} · Waiting ${formatTimer(waitingSession)} · ${formatCost(session.cost_rub)}`
  } else if (session.status === 'finish_photo') {
    detail = `${session.scooter_number} · Photo required`
  }

  return (
    <button type="button" className="session-banner" onClick={onContinue}>
      <span className={`session-banner__dot session-banner__dot--${session.status}`} />
      <span className="session-banner__text">
        <span className="session-banner__title">{labels[session.status]}</span>
        <span className="session-banner__detail">{detail}</span>
      </span>
      <ChevronRight size={20} />
    </button>
  )
}
