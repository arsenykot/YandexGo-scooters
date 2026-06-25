import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { Flashlight } from 'lucide-react'
import { api } from '../api'
import { COPY, ZONE } from '../constants'
import { parseScooterNumberFromQr } from '../utils'
import { cameraErrorMessage, pickBackCameraId } from '../utils/camera'
import { AppShell } from '../components/AppShell'
import { AppHeader } from '../components/AppHeader'
import './QRScannerPage.css'

export function QRScannerPage() {
  const navigate = useNavigate()
  const readerId = useId().replace(/:/g, '')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const busyRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [showEnter, setShowEnter] = useState(false)
  const [manualNumber, setManualNumber] = useState('')

  const goToScooter = async (number: string) => {
    try {
      await api.selectScooter(number)
      navigate(`/scooter/${number}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scooter not found in this zone')
    }
  }

  useEffect(() => {
    let cancelled = false

    async function startScanner() {
      if (busyRef.current) return
      busyRef.current = true

      const scanner = new Html5Qrcode(readerId, { verbose: false })
      scannerRef.current = scanner

      try {
        const cameraId = await pickBackCameraId(() => Html5Qrcode.getCameras())
        if (cancelled) return

        const config = {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const size = Math.min(viewfinderWidth, viewfinderHeight, 280) * 0.75
            return { width: size, height: size }
          },
          aspectRatio: 1,
        }

        const onScan = (decoded: string) => {
          const number = parseScooterNumberFromQr(decoded)
          if (!number) return
          void scanner.stop().then(() => goToScooter(number))
        }

        if (cameraId) {
          await scanner.start(cameraId, config, onScan, () => {})
        } else {
          await scanner.start({ facingMode: 'environment' }, config, onScan, () => {})
        }
      } catch (e) {
        if (!cancelled) {
          setError(cameraErrorMessage(e))
        }
      } finally {
        busyRef.current = false
      }
    }

    // Small delay helps React StrictMode remount in dev
    const timer = window.setTimeout(() => {
      void startScanner()
    }, 80)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      const scanner = scannerRef.current
      scannerRef.current = null
      if (scanner) {
        void scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {})
      }
      busyRef.current = false
    }
  }, [readerId, navigate])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const number = parseScooterNumberFromQr(manualNumber) ?? manualNumber.trim().toUpperCase()
    if (number) goToScooter(number)
    else setError('Enter a valid number, e.g. HA538P')
  }

  return (
    <AppShell variant="fullscreen">
      <div className="qr-page">
        <AppHeader showBack dark service="Scan" />
        <div className="qr-body">
          <p className="qr-hint">{COPY.scanHint}</p>
          <p className="qr-zone">{ZONE.name} fleet</p>
          <div className="qr-viewport">
            <div id={readerId} className="qr-reader" />
            <div className="qr-frame" aria-hidden />
          </div>
          {error && <p className="qr-error">{error}</p>}

          <div className="qr-controls">
            <button
              type="button"
              className="qr-enter-btn qr-enter-btn--prominent"
              onClick={() => setShowEnter(true)}
            >
              Enter number manually
            </button>
            <button type="button" className="qr-round-btn" aria-label="Flashlight">
              <Flashlight size={20} />
            </button>
          </div>
        </div>
      </div>

      {showEnter && (
        <div className="enter-overlay">
          <form className="enter-modal" onSubmit={handleManualSubmit}>
            <h3>Scooter number</h3>
            <p className="enter-modal__hint">Printed below the QR code on the handlebar</p>
            <input
              type="text"
              placeholder="HA538P"
              value={manualNumber}
              onChange={(e) => setManualNumber(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            <div className="enter-actions">
              <button type="button" onClick={() => setShowEnter(false)}>Cancel</button>
              <button type="submit" className="primary">Find scooter</button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  )
}
