export type SessionStatus =
  | 'selected'
  | 'reserved'
  | 'riding'
  | 'paused'
  | 'finish_photo'

export type TariffType =
  | 'per_minute'
  | 'package_30'
  | 'package_50'
  | 'package_100'
  | 'package_300'

export interface ScooterSummary {
  id: string
  number: string
  battery: number
  lat_pct: number
  lng_pct: number
  available: boolean
}

export interface TariffOption {
  id: TariffType
  label: string
  subtitle: string
  price: string
  original_price?: string | null
}

export interface ScooterDetail extends ScooterSummary {
  range_hours: number
  tariffs: TariffOption[]
}

export interface Session {
  status: SessionStatus
  scooter_number: string
  scooter_id: string
  battery: number
  range_hours: number
  lat_pct: number
  lng_pct: number
  tariff: TariffType
  elapsed_seconds: number
  riding_seconds: number
  waiting_total_seconds: number
  waiting_session_seconds: number
  cost_rub: number
  free_wait_remaining_seconds?: number | null
  package_minutes_remaining?: number | null
  wallet_minutes_remaining?: number | null
  server_time: string
}

export interface CompleteRide {
  scooter_number: string
  riding_seconds: number
  waiting_total_seconds: number
  cost_rub: number
  tariff: TariffType
  prepaid_minutes_used?: number
}

export interface Wallet {
  prepaid_seconds: number
  prepaid_minutes: number
}

export interface PurchaseReceipt {
  tariff: TariffType
  minutes_added: number
  price_rub: number
  prepaid_seconds: number
  prepaid_minutes: number
}

export const RENTED_STATUSES: SessionStatus[] = [
  'reserved',
  'riding',
  'paused',
  'finish_photo',
]

export function isRented(status: SessionStatus): boolean {
  return RENTED_STATUSES.includes(status)
}

export function isPackageTariff(tariff: TariffType): boolean {
  return tariff !== 'per_minute'
}
