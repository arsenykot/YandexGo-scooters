import { useEffect, useState } from 'react'

import { useLocation, useNavigate } from 'react-router-dom'

import { ScanLine } from 'lucide-react'

import { api } from '../api'

import type { CompleteRide, ScooterSummary } from '../types'

import { COPY, ZONE } from '../constants'

import { AppShell } from '../components/AppShell'

import { AppHeader } from '../components/AppHeader'

import { MapLayout } from '../components/MapLayout'

import { MapBackground } from '../components/MapBackground'

import { ControlPanel } from '../components/ControlPanel'

import { NearbyScooterList } from '../components/NearbyScooterList'

import { WalletBanner } from '../components/WalletBanner'
import { ActiveRentals } from '../components/SessionBanner'

import { RideReceiptModal } from '../components/RideReceiptModal'

import { Toast } from '../components/Toast'

import { useSessionsContext } from '../context/SessionsContext'

import { useToast } from '../hooks/useToast'

import './MainPage.css'



export function MainPage() {

  const navigate = useNavigate()

  const location = useLocation()

  const [scooters, setScooters] = useState<ScooterSummary[]>([])

  const [loading, setLoading] = useState(true)

  const [completedRide, setCompletedRide] = useState<CompleteRide | null>(null)

  const { sessions, resetDemo, wallet } = useSessionsContext()

  const { message, show } = useToast()



  useEffect(() => {

    const load = () => {

      api.listScooters()

        .then(setScooters)

        .catch(console.error)

        .finally(() => setLoading(false))

    }

    load()

    const onFocus = () => load()

    window.addEventListener('focus', onFocus)

    return () => window.removeEventListener('focus', onFocus)

  }, [])



  useEffect(() => {

    const ride = (location.state as { completedRide?: CompleteRide } | null)

      ?.completedRide

    if (ride) {

      setCompletedRide(ride)

      window.history.replaceState({}, '')

    }

  }, [location.state])



  const openScooter = async (number: string) => {

    try {

      await api.selectScooter(number)

      navigate(`/scooter/${number}`)

    } catch (e) {

      show(e instanceof Error ? e.message : 'Could not open scooter')

    }

  }



  const continueSession = (scooterNumber: string) => {

    const session = sessions.find((s) => s.scooter_number === scooterNumber)

    if (session?.status === 'finish_photo') {

      navigate(`/finish-photo/${scooterNumber}`)

      return

    }

    navigate(`/scooter/${scooterNumber}`)

  }



  const handleReset = async () => {

    try {

      await resetDemo()

      const fresh = await api.listScooters()

      setScooters(fresh)

      show('Demo reset')

    } catch (e) {

      show(e instanceof Error ? e.message : 'Reset failed')

    }

  }



  return (

    <AppShell variant="map">

      <AppHeader showScan service="Scooters" />

      <MapLayout

        map={

          <MapBackground

            mode="fleet"

            scooters={scooters}

            onMarkerClick={openScooter}

          />

        }

        panel={

          <ControlPanel

            title={ZONE.label}

            subtitle={COPY.demoNote}

            action={

              <button type="button" className="demo-reset-btn" onClick={handleReset}>

                Reset demo

              </button>

            }

          >

            <WalletBanner minutes={wallet.prepaid_minutes} />

            <ActiveRentals sessions={sessions} onContinue={continueSession} />



            <button

              type="button"

              className="scan-hero"

              onClick={() => navigate('/scan')}

            >

              <span className="scan-hero__icon">

                <ScanLine size={26} strokeWidth={2.2} />

              </span>

              <span className="scan-hero__text">

                <span className="scan-hero__title">Scan to ride</span>

                <span className="scan-hero__sub">QR on handlebars or enter number</span>

              </span>

            </button>



            <NearbyScooterList

              scooters={scooters}

              onSelect={openScooter}

              loading={loading}

            />

          </ControlPanel>

        }

      />

      <Toast message={message} />

      {completedRide && (

        <RideReceiptModal

          ride={completedRide}

          onClose={() => setCompletedRide(null)}

        />

      )}

    </AppShell>

  )

}

