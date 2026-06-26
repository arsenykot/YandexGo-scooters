import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Lock, Pause, Play, Volume2, X, XCircle } from 'lucide-react'
import { api } from '../api'
import type { PurchaseReceipt, ScooterDetail, Session, TariffType } from '../types'
import { isPackageTariff } from '../types'
import { COPY } from '../constants'
import {
  formatCost,
  formatFreeWait,
  formatTimer,
  playBeep,
  walkMinutesFromCenter,
} from '../utils'
import { AppShell } from '../components/AppShell'
import { AppHeader } from '../components/AppHeader'
import { MapLayout } from '../components/MapLayout'
import { MapBackground } from '../components/MapBackground'
import { ControlPanel } from '../components/ControlPanel'
import { ScooterCard } from '../components/ScooterCard'
import { TariffSelector } from '../components/TariffSelector'
import { ActionBar } from '../components/ActionBar'
import { ConfirmModal } from '../components/ConfirmModal'
import { PageLoader } from '../components/PageLoader'
import { PurchaseReceiptModal } from '../components/PurchaseReceiptModal'
import { RentalSwitcher } from '../components/RentalSwitcher'
import { Toast } from '../components/Toast'
import { WalletBanner } from '../components/WalletBanner'
import { useScooterSession, useSessionsContext } from '../context/SessionsContext'
import { useToast } from '../hooks/useToast'
import './ScooterPage.css'

export function ScooterPage() {
  const { number = '' } = useParams()
  const navigate = useNavigate()
  const { session, refresh } = useScooterSession(number)
  const { sessions, rentedScooters, wallet } = useSessionsContext()
  const { message, show } = useToast()
  const [scooter, setScooter] = useState<ScooterDetail | null>(null)
  const [tariff, setTariff] = useState<TariffType>('per_minute')
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [loading, setLoading] = useState(false)
  const [purchaseReceipt, setPurchaseReceipt] = useState<PurchaseReceipt | null>(null)

  useEffect(() => {
    if (!number) return
    api.getScooter(number).then(setScooter).catch(() => navigate('/'))
    api.selectScooter(number).catch(console.error)
  }, [number, navigate])

  useEffect(() => {
    if (session?.status === 'finish_photo') {
      navigate(`/finish-photo/${number}`)
    }
  }, [session?.status, navigate, number])

  const status = session?.status ?? 'selected'
  const selectedTariff = scooter?.tariffs.find((t) => t.id === tariff)
  const isPackage = isPackageTariff(tariff)

  const handleReserve = async () => {
    setLoading(true)
    try {
      await api.reserve(number, 'per_minute')
      await refresh()
    } catch (e) {
      show(e instanceof Error ? e.message : 'Reserve failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async () => {
    if (!isPackage) return
    setLoading(true)
    try {
      const receipt = await api.purchasePackage(tariff)
      setPurchaseReceipt(receipt)
      setTariff('per_minute')
      await refresh()
    } catch (e) {
      show(e instanceof Error ? e.message : 'Purchase failed')
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    setLoading(true)
    try {
      await api.start(number)
      await refresh()
    } catch (e) {
      show(e instanceof Error ? e.message : 'Start failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePause = async () => {
    try {
      await api.pause(number)
      await refresh()
    } catch (e) {
      show(e instanceof Error ? e.message : 'Pause failed')
    }
  }

  const handleResume = async () => {
    try {
      await api.resume(number)
      await refresh()
    } catch (e) {
      show(e instanceof Error ? e.message : 'Resume failed')
    }
  }

  const handleCancel = async () => {
    try {
      await api.cancel(number)
      navigate('/')
    } catch (e) {
      show(e instanceof Error ? e.message : 'Cancel failed')
    }
  }

  const handleFinish = async () => {
    try {
      await api.finish(number)
      navigate(`/finish-photo/${number}`)
    } catch (e) {
      show(e instanceof Error ? e.message : 'Finish failed')
    }
  }

  const handleBeep = async () => {
    try {
      await api.beep(number)
      playBeep()
      show('Signal sent to scooter')
    } catch (e) {
      show(e instanceof Error ? e.message : 'Beep failed')
    }
  }

  const handleUnlock = () => {
    show(COPY.stubFeature)
  }

  const mapScooters = useMemo(() => {
    const byNumber = new Map(rentedScooters.map((s) => [s.number, s]))
    if (scooter && !byNumber.has(scooter.number)) {
      byNumber.set(scooter.number, scooter)
    }
    return Array.from(byNumber.values())
  }, [rentedScooters, scooter])

  const rentedNumbers = useMemo(
    () => rentedScooters.map((s) => s.number),
    [rentedScooters],
  )

  if (!scooter) {
    return (
      <AppShell variant="map">
        <AppHeader showBack service="Scooters" />
        <PageLoader />
      </AppShell>
    )
  }

  const displaySession: Session | null = session
  const battery = displaySession?.battery ?? scooter.battery
  const rangeHours = displaySession?.range_hours ?? scooter.range_hours
  const isTall = status !== 'selected'
  const walkMin = walkMinutesFromCenter(scooter.lat_pct, scooter.lng_pct)

  const panelTitles: Record<string, { title: string; subtitle?: string }> = {
    selected: {
      title: 'Ready to ride',
      subtitle: isPackage
        ? 'Buy minutes or switch to per-minute to reserve'
        : 'Choose a tariff and reserve',
    },
    reserved: { title: 'Reserved', subtitle: 'Free wait time is running' },
    riding: { title: 'Ride in progress' },
    paused: { title: 'Waiting' },
  }

  const walletHint =
    displaySession?.wallet_minutes_remaining != null
      ? `${displaySession.wallet_minutes_remaining} min on balance`
      : wallet.prepaid_minutes > 0
        ? `${wallet.prepaid_minutes} min on balance`
        : null

  const panelContent = (
    <ControlPanel
      key={status}
      title={panelTitles[status]?.title ?? scooter.number}
      subtitle={panelTitles[status]?.subtitle}
    >
      <RentalSwitcher
        sessions={sessions}
        currentNumber={scooter.number}
        onSelect={(n) => navigate(`/scooter/${n}`)}
      />

      {status === 'selected' && (
        <>
          <WalletBanner minutes={wallet.prepaid_minutes} />
          <ScooterCard
            number={scooter.number}
            battery={battery}
            rangeHours={rangeHours}
            walkMin={walkMin}
          />
          <div className="section-label">Tariff</div>
          <TariffSelector tariffs={scooter.tariffs} selected={tariff} onSelect={setTariff} />
          <div className="reserve-row">
            <div className="payment-chip" title="Alfa-Bank">
              <span className="payment-chip__mark">α</span>
            </div>
            {isPackage ? (
              <button
                type="button"
                className="btn-reserve"
                disabled={loading}
                onClick={handlePurchase}
              >
                <span>{loading ? 'Processing…' : `Buy ${selectedTariff?.label ?? 'package'}`}</span>
                <small>{selectedTariff?.price ?? ''} · credited to your balance</small>
              </button>
            ) : (
              <button
                type="button"
                className="btn-reserve"
                disabled={loading}
                onClick={handleReserve}
              >
                <span>{loading ? 'Reserving…' : 'Reserve'}</span>
                <small>
                  ₽8.99/min after free wait
                  {wallet.prepaid_minutes > 0 ? ` · ${wallet.prepaid_minutes} min prepaid` : ''}
                </small>
              </button>
            )}
          </div>
          <p className="legal">
            {isPackage ? (
              <>Minute packages are added to your account and used during rides.</>
            ) : (
              <>
                By tapping Reserve you agree to the{' '}
                <button type="button" className="link">Terms of Use</button>
              </>
            )}
          </p>
        </>
      )}

      {status === 'reserved' && displaySession && (
        <>
          <WalletBanner minutes={wallet.prepaid_minutes} />
          <div className="status-banner status-banner--wait">
            <span>Free wait</span>
            <span className="status-banner__value">
              {formatFreeWait(displaySession.free_wait_remaining_seconds ?? 0)}
            </span>
          </div>
          <ScooterCard number={scooter.number} battery={battery} rangeHours={rangeHours} />
          <ActionBar
            actions={[
              { id: 'cancel', label: 'Cancel', icon: XCircle, onClick: () => setConfirmCancel(true) },
              { id: 'beep', label: 'Beep', icon: Volume2, onClick: handleBeep },
              { id: 'unlock', label: 'Unlock', icon: Lock, onClick: handleUnlock },
            ]}
          />
          <button type="button" className="btn-start" disabled={loading} onClick={handleStart}>
            <Play size={18} fill="currentColor" /> {loading ? 'Starting…' : 'Start ride'}
          </button>
        </>
      )}

      {(status === 'riding' || status === 'paused') && displaySession && (
        <>
          <div
            className={`status-banner status-banner--animated ${
              status === 'paused' ? 'status-banner--paused' : 'status-banner--ride'
            }`}
          >
            <span>
              {status === 'paused' ? 'Waiting' : 'Riding'}
              {walletHint ? ` · ${walletHint}` : ''}
              {' · '}
              {formatTimer(
                status === 'paused'
                  ? (displaySession.waiting_session_seconds ?? 0)
                  : (displaySession.riding_seconds ?? displaySession.elapsed_seconds),
              )}
            </span>
            <span className="status-banner__value">
              {displaySession.cost_rub > 0 ? formatCost(displaySession.cost_rub) : '0₽'}
            </span>
          </div>
          <ScooterCard number={scooter.number} battery={battery} rangeHours={rangeHours} />
          <ActionBar
            actions={
              status === 'paused'
                ? [
                    { id: 'resume', label: 'Resume', icon: Play, onClick: handleResume },
                    { id: 'unlock', label: 'Unlock', icon: Lock, onClick: handleUnlock },
                    { id: 'beep', label: 'Beep', icon: Volume2, onClick: handleBeep },
                  ]
                : [
                    { id: 'pause', label: 'Pause', icon: Pause, onClick: handlePause },
                    { id: 'unlock', label: 'Unlock', icon: Lock, onClick: handleUnlock },
                    { id: 'beep', label: 'Beep', icon: Volume2, onClick: handleBeep },
                  ]
            }
          />
          <button type="button" className="btn-finish" onClick={() => setConfirmFinish(true)}>
            <X size={18} /> End ride
          </button>
        </>
      )}
    </ControlPanel>
  )

  return (
    <AppShell variant="map">
      <AppHeader showBack onBack={() => navigate('/')} service="Scooters" />
      <MapLayout
        panelTall={isTall}
        map={
          <MapBackground
            mode="focus"
            scooters={mapScooters}
            highlightNumber={scooter.number}
            rentedNumbers={rentedNumbers}
            rentedCount={rentedScooters.length}
            onMarkerClick={(n) => navigate(`/scooter/${n}`)}
            showUserDot={status === 'riding' || status === 'paused'}
            userPosition={{ lat_pct: scooter.lat_pct, lng_pct: scooter.lng_pct }}
          />
        }
        panel={panelContent}
      />

      {confirmFinish && (
        <ConfirmModal
          title="Finish ride?"
          confirmLabel="Yes, finish"
          onCancel={() => setConfirmFinish(false)}
          onConfirm={() => {
            setConfirmFinish(false)
            handleFinish()
          }}
        />
      )}
      {confirmCancel && (
        <ConfirmModal
          title="Cancel ride?"
          confirmLabel="Yes, cancel"
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => {
            setConfirmCancel(false)
            handleCancel()
          }}
        />
      )}
      {purchaseReceipt && (
        <PurchaseReceiptModal
          purchase={purchaseReceipt}
          onClose={() => setPurchaseReceipt(null)}
        />
      )}
      <Toast message={message} />
    </AppShell>
  )
}
