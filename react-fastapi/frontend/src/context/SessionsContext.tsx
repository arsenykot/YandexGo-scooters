import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../api'
import type { ScooterSummary, Session, Wallet } from '../types'
import { isRented } from '../types'

interface SessionsContextValue {
  sessions: Session[]
  rentedScooters: ScooterSummary[]
  rentedSessions: Session[]
  wallet: Wallet
  loading: boolean
  refresh: () => Promise<void>
  getSession: (number: string) => Session | null
  resetDemo: () => Promise<void>
}

const EMPTY_WALLET: Wallet = { prepaid_seconds: 0, prepaid_minutes: 0 }

const SessionsContext = createContext<SessionsContextValue | null>(null)

export function SessionsProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [rentedScooters, setRentedScooters] = useState<ScooterSummary[]>([])
  const [wallet, setWallet] = useState<Wallet>(EMPTY_WALLET)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const [nextSessions, nextRented, nextWallet] = await Promise.all([
        api.listSessions(),
        api.listRentedScooters(),
        api.getWallet(),
      ])
      setSessions(nextSessions)
      setRentedScooters(nextRented)
      setWallet(nextWallet)
    } catch {
      // keep last good state during transient errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 1000)
    return () => clearInterval(id)
  }, [refresh])

  const resetDemo = useCallback(async () => {
    await api.resetDemo()
    await refresh()
  }, [refresh])

  const rentedSessions = useMemo(
    () => sessions.filter((s) => isRented(s.status)),
    [sessions],
  )

  const getSession = useCallback(
    (number: string) =>
      sessions.find((s) => s.scooter_number === number.toUpperCase()) ?? null,
    [sessions],
  )

  const value = useMemo(
    () => ({
      sessions,
      rentedScooters,
      rentedSessions,
      wallet,
      loading,
      refresh,
      getSession,
      resetDemo,
    }),
    [sessions, rentedScooters, rentedSessions, wallet, loading, refresh, getSession, resetDemo],
  )

  return (
    <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>
  )
}

export function useSessionsContext() {
  const ctx = useContext(SessionsContext)
  if (!ctx) {
    throw new Error('useSessionsContext must be used within SessionsProvider')
  }
  return ctx
}

export function useScooterSession(number: string) {
  const { getSession, refresh, loading } = useSessionsContext()
  const session = number ? getSession(number) : null
  return { session, loading, refresh }
}
