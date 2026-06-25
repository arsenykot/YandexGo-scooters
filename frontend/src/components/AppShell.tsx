import type { ReactNode } from 'react'
import './AppShell.css'

interface AppShellProps {
  children: ReactNode
  variant?: 'map' | 'fullscreen'
}

export function AppShell({ children, variant = 'map' }: AppShellProps) {
  return (
    <div className={`app-shell app-shell--${variant}`}>
      {children}
    </div>
  )
}
