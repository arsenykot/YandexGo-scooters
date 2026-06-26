import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import type { CompleteRide } from '../types'
import { COPY } from '../constants'
import { useCameraStream } from '../hooks/useCameraStream'
import { AppShell } from '../components/AppShell'
import { AppHeader } from '../components/AppHeader'
import './FinishPhotoPage.css'

export function FinishPhotoPage() {
  const { number = '' } = useParams()
  const navigate = useNavigate()
  const { videoRef, active, error: cameraError } = useCameraStream()
  const [error, setError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (!number) {
      navigate('/')
      return
    }
    api.getSession(number).then((session) => {
      if (!session || session.status !== 'finish_photo') {
        navigate('/')
      }
    })
  }, [navigate, number])

  const displayError = error ?? cameraError
  const cameraUnavailable = Boolean(displayError && !active)

  const finishRide = async () => {
    if (capturing || !number) return
    setCapturing(true)
    setFlash(true)
    window.setTimeout(() => setFlash(false), 180)
    try {
      const result: CompleteRide = await api.complete(number)
      navigate('/', { state: { completedRide: result } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete ride')
      setCapturing(false)
    }
  }

  return (
    <AppShell variant="fullscreen">
      <div className="finish-page">
        <AppHeader showBack onBack={() => navigate(-1)} dark service="End ride" />
        <div className="finish-body">
          <video
            ref={videoRef}
            className={`finish-video ${active ? 'finish-video--live' : ''}`}
            playsInline
            muted
            autoPlay
          />
          {flash && <div className="finish-flash" aria-hidden />}
          <div className="finish-overlay">
            <p className="finish-message">
              {cameraUnavailable
                ? 'Camera unavailable — you can still finish the ride in demo mode'
                : (displayError ?? `${COPY.finishHint} · ${number}`)}
            </p>
            <div className="finish-actions">
              <button
                type="button"
                className={`shutter-btn ${capturing ? 'shutter-btn--busy' : ''}`}
                onClick={finishRide}
                disabled={capturing}
                aria-label="Take photo"
              >
                <span className="shutter-btn__inner" />
              </button>
              {cameraUnavailable && (
                <button
                  type="button"
                  className="finish-skip-btn"
                  onClick={finishRide}
                  disabled={capturing}
                >
                  Finish without photo (demo)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
