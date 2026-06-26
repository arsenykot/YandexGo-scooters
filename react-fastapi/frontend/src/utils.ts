export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatFreeWait(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function formatCost(cost: number): string {
  if (cost === 0) return '0₽'
  if (cost < 1) return `${cost.toFixed(2)}₽`
  return `${Math.round(cost)}₽`
}

export const TARIFF_LABELS: Record<string, string> = {
  per_minute: 'Per minute',
  package_30: '30 min pack',
  package_50: '50 min pack',
  package_100: '100 min pack',
  package_300: '300 min pack',
}

export function tariffLabel(tariff: string): string {
  return TARIFF_LABELS[tariff] ?? tariff
}

export function parseScooterNumberFromQr(text: string): string | null {
  try {
    const url = new URL(text)
    const number = url.searchParams.get('number')
    if (number) return number.toUpperCase()
  } catch {
    // not a URL
  }
  const trimmed = text.trim().toUpperCase()
  if (/^[A-Z]{2}\d{3}[A-Z]$/.test(trimmed)) return trimmed
  return null
}

/** Rough walk time from map center (user) to scooter marker in %. */
export function walkMinutesFromCenter(latPct: number, lngPct: number): number {
  const dx = lngPct - 50
  const dy = latPct - 52
  const dist = Math.sqrt(dx * dx + dy * dy)
  return Math.max(1, Math.round(dist * 1.4))
}

export function batteryTone(percent: number): 'high' | 'mid' | 'low' {
  if (percent >= 60) return 'high'
  if (percent >= 30) return 'mid'
  return 'low'
}

export function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch {
    // audio not available
  }
}
