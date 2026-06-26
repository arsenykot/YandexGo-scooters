import type { ReactNode } from 'react'
import './ControlPanel.css'

interface ControlPanelProps {
  children: ReactNode
  title?: string
  subtitle?: string
  action?: ReactNode
}

export function ControlPanel({ children, title, subtitle, action }: ControlPanelProps) {
  return (
    <div className="control-panel">
      <div className="control-panel__handle" aria-hidden />
      {(title || subtitle || action) && (
        <div className="control-panel__head">
          <div className="control-panel__head-text">
            {title && <h2 className="control-panel__title">{title}</h2>}
            {subtitle && <p className="control-panel__subtitle">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="control-panel__content">{children}</div>
    </div>
  )
}
