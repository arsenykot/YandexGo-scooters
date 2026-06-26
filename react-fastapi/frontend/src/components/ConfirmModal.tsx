import './ConfirmModal.css'

interface ConfirmModalProps {
  title: string
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  confirmLabel,
  cancelLabel = 'Back',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-backdrop" onClick={onCancel} aria-hidden />
      <div className="confirm-modal">
        <h3>{title}</h3>
        <div className="confirm-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
