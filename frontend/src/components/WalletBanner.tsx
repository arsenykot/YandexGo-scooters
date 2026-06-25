import './WalletBanner.css'

interface WalletBannerProps {
  minutes: number
}

export function WalletBanner({ minutes }: WalletBannerProps) {
  if (minutes <= 0) return null

  return (
    <div className="wallet-banner">
      <span className="wallet-banner__label">Minute balance</span>
      <span className="wallet-banner__value">{minutes} min</span>
    </div>
  )
}
