import type { ReactNode } from 'react'
import './MapLayout.css'

interface MapLayoutProps {
  map: ReactNode
  panel: ReactNode
  panelTall?: boolean
}

export function MapLayout({ map, panel, panelTall }: MapLayoutProps) {
  return (
    <div className={`map-layout ${panelTall ? 'map-layout--tall' : ''}`}>
      <div className="map-layout__map">{map}</div>
      <aside className="map-layout__panel">{panel}</aside>
    </div>
  )
}
