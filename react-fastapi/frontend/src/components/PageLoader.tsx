import './PageLoader.css'

export function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader__spinner" />
      <span>Loading scooter…</span>
    </div>
  )
}
