import type { TariffOption, TariffType } from '../types'
import './TariffSelector.css'

interface TariffSelectorProps {
  tariffs: TariffOption[]
  selected: TariffType
  onSelect: (id: TariffType) => void
}

export function TariffSelector({ tariffs, selected, onSelect }: TariffSelectorProps) {
  return (
    <div className="tariff-scroll">
      {tariffs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tariff-card ${selected === t.id ? 'selected' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          <span className="tariff-label">{t.label}</span>
          <span className="tariff-sub">{t.subtitle}</span>
          <span className="tariff-price">{t.price}</span>
          {t.original_price && (
            <span className="tariff-original">{t.original_price}</span>
          )}
        </button>
      ))}
    </div>
  )
}
