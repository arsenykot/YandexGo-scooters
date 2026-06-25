import type { CompleteRide, PurchaseReceipt, ScooterDetail, ScooterSummary, Session, TariffType, Wallet } from './types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  listScooters: () => request<ScooterSummary[]>('/scooters'),
  listRentedScooters: () => request<ScooterSummary[]>('/scooters/rented'),
  getScooter: (number: string) => request<ScooterDetail>(`/scooters/${number}`),
  listSessions: () => request<Session[]>('/session/sessions'),
  getSession: (number: string) => request<Session | null>(`/session/${number}`),
  selectScooter: (number: string) =>
    request<Session>(`/session/select/${number}`, { method: 'POST' }),
  reserve: (number: string, tariff: TariffType) =>
    request<Session>('/session/reserve', {
      method: 'POST',
      body: JSON.stringify({ number, tariff }),
    }),
  start: (number: string) =>
    request<Session>(`/session/${number}/start`, { method: 'POST' }),
  pause: (number: string) =>
    request<Session>(`/session/${number}/pause`, { method: 'POST' }),
  resume: (number: string) =>
    request<Session>(`/session/${number}/resume`, { method: 'POST' }),
  cancel: (number: string) =>
    request<{ status: string }>(`/session/${number}/cancel`, { method: 'POST' }),
  finish: (number: string) =>
    request<Session>(`/session/${number}/finish`, { method: 'POST' }),
  complete: (number: string) =>
    request<CompleteRide>(`/session/${number}/complete`, { method: 'POST' }),
  beep: (number: string) =>
    request<{ message: string }>(`/session/${number}/beep`, { method: 'POST' }),
  resetDemo: () => request<{ status: string }>('/session/reset', { method: 'POST' }),
  getWallet: () => request<Wallet>('/wallet'),
  purchasePackage: (tariff: TariffType) =>
    request<PurchaseReceipt>('/wallet/purchase', {
      method: 'POST',
      body: JSON.stringify({ tariff }),
    }),
}
