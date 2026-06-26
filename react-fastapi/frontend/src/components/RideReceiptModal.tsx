import type { CompleteRide } from '../types'
import { formatCost, formatTimer, tariffLabel } from '../utils'
import './RideReceiptModal.css'

interface RideReceiptModalProps {
  ride: CompleteRide
  onClose: () => void
}

export function RideReceiptModal({ ride, onClose }: RideReceiptModalProps) {
  const totalMinutes = Math.max(
    1,
    Math.round((ride.riding_seconds + ride.waiting_total_seconds) / 60),
  )

  return (
    <div className="ride-receipt-backdrop" onClick={onClose} role="presentation">
      <div
        className="ride-receipt"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="ride-receipt-title"
      >
        <div className="ride-receipt__icon">✓</div>
        <h2 id="ride-receipt-title" className="ride-receipt__title">Ride complete</h2>
        <p className="ride-receipt__scooter">{ride.scooter_number}</p>
        <dl className="ride-receipt__rows">
          <div>
            <dt>Tariff</dt>
            <dd>{tariffLabel(ride.tariff)}</dd>
          </div>
          <div>
            <dt>Riding</dt>
            <dd>{formatTimer(ride.riding_seconds)}</dd>
          </div>
          {ride.waiting_total_seconds > 0 && (
            <div>
              <dt>Waiting</dt>
              <dd>{formatTimer(ride.waiting_total_seconds)}</dd>
            </div>
          )}
          <div>
            <dt>Total time</dt>
            <dd>~{totalMinutes} min</dd>
          </div>
          {(ride.prepaid_minutes_used ?? 0) > 0 && (
            <div>
              <dt>From balance</dt>
              <dd>{ride.prepaid_minutes_used} min</dd>
            </div>
          )}
          <div className="ride-receipt__total">
            <dt>Charged extra</dt>
            <dd>{ride.cost_rub > 0 ? formatCost(ride.cost_rub) : '0₽'}</dd>
          </div>
        </dl>
        <button type="button" className="ride-receipt__btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}
