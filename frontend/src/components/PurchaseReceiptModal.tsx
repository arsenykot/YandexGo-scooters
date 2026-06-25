import type { PurchaseReceipt } from '../types'
import { formatCost, tariffLabel } from '../utils'
import './RideReceiptModal.css'

interface PurchaseReceiptModalProps {
  purchase: PurchaseReceipt
  onClose: () => void
}

export function PurchaseReceiptModal({ purchase, onClose }: PurchaseReceiptModalProps) {
  return (
    <div className="ride-receipt-backdrop" onClick={onClose} role="presentation">
      <div
        className="ride-receipt ride-receipt--purchase"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="purchase-receipt-title"
      >
        <div className="ride-receipt__icon ride-receipt__icon--purchase">+</div>
        <h2 id="purchase-receipt-title" className="ride-receipt__title">Minutes purchased</h2>
        <p className="ride-receipt__scooter">{tariffLabel(purchase.tariff)}</p>
        <dl className="ride-receipt__rows">
          <div>
            <dt>Added to balance</dt>
            <dd>{purchase.minutes_added} min</dd>
          </div>
          <div>
            <dt>Paid</dt>
            <dd>{formatCost(purchase.price_rub)}</dd>
          </div>
          <div className="ride-receipt__total">
            <dt>Your balance</dt>
            <dd>{purchase.prepaid_minutes} min</dd>
          </div>
        </dl>
        <p className="ride-receipt__note">
          Minutes are spent during rides first. Per-minute billing starts only after your balance runs out.
        </p>
        <button type="button" className="ride-receipt__btn" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  )
}
