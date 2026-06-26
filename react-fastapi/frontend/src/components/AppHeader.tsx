import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ScanLine } from 'lucide-react'
import './AppHeader.css'

const LOGO_URL = '/media/YandexGoLogo.png'

interface AppHeaderProps {
  showBack?: boolean
  onBack?: () => void
  showScan?: boolean
  service?: string
  dark?: boolean
}

export function AppHeader({ showBack, onBack, showScan, service, dark }: AppHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className={`app-header ${dark ? 'app-header--dark' : ''}`}>
      <div className="app-header__left">
        {showBack && (
          <button
            type="button"
            className="app-header__back"
            onClick={onBack ?? (() => navigate('/'))}
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="app-header__brand">
          <img src={LOGO_URL} alt="Yandex Go" className="app-header__logo-img" />
          {service && <span className="app-header__service">{service}</span>}
        </div>
      </div>
      {showScan && (
        <button
          type="button"
          className="app-header__scan"
          onClick={() => navigate('/scan')}
        >
          <ScanLine size={18} />
          <span>Scan</span>
        </button>
      )}
    </header>
  )
}
