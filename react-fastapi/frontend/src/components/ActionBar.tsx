import type { LucideIcon } from 'lucide-react'
import './ActionBar.css'

export interface ActionItem {
  id: string
  label: string
  icon: LucideIcon
  onClick: () => void
}

interface ActionBarProps {
  actions: ActionItem[]
}

export function ActionBar({ actions }: ActionBarProps) {
  return (
    <div className="action-bar">
      {actions.map(({ id, label, icon: Icon, onClick }) => (
        <button key={id} type="button" className="action-btn" onClick={onClick}>
          <Icon size={18} strokeWidth={2} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
