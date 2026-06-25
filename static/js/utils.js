/** Shared helpers — port of frontend/src/utils.ts */
;(function (global) {
  'use strict'

  const TARIFF_LABELS = {
    per_minute: 'Per minute',
    package_30: '30 min pack',
    package_50: '50 min pack',
    package_100: '100 min pack',
    package_300: '300 min pack',
  }

  const ZONE = { name: 'Demo zone', label: 'Nearby scooters' }

  const COPY = {
    demoNote: 'Kickshare simulation',
    stubFeature: 'Available in the full Yandex Go app',
    scanHint: 'Scan the QR code on the handlebars',
    finishHint: 'Park correctly and take a photo to end the ride',
  }

  const RENTED_STATUSES = ['reserved', 'riding', 'paused', 'finish_photo']

  function formatTimer(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function formatFreeWait(seconds) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  function formatCost(cost) {
    if (cost === 0) return '0₽'
    if (cost < 1) return `${cost.toFixed(2)}₽`
    return `${Math.round(cost)}₽`
  }

  function formatDate(iso) {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function formatDateTime(iso) {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function tariffLabel(tariff) {
    return TARIFF_LABELS[tariff] || tariff
  }

  function parseScooterNumberFromQr(text) {
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

  function walkMinutesFromCenter(latPct, lngPct) {
    const dx = lngPct - 50
    const dy = latPct - 52
    const dist = Math.sqrt(dx * dx + dy * dy)
    return Math.max(1, Math.round(dist * 1.4))
  }

  function batteryTone(percent) {
    if (percent >= 60) return 'high'
    if (percent >= 30) return 'mid'
    return 'low'
  }

  function isRented(status) {
    return RENTED_STATUSES.includes(status)
  }

  function isPackageTariff(tariff) {
    return tariff !== 'per_minute'
  }

  function playBeep() {
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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function cameraErrorMessage(err) {
    const name = err && err.name
    const msg = err && err.message ? String(err.message) : ''
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Camera permission denied. Allow camera access or enter the number manually.'
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No camera found on this device.'
    }
    if (msg.includes('secure') || msg.includes('HTTPS')) {
      return 'Camera requires a local server. Run: python -m http.server 8080'
    }
    return 'Could not start the camera. Try reload or enter the scooter number.'
  }

  async function getCameraStream() {
    const constraintsList = [
      { video: { facingMode: { exact: 'environment' } }, audio: false },
      { video: { facingMode: 'environment' }, audio: false },
      { video: true, audio: false },
    ]
    for (const constraints of constraintsList) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints)
      } catch {
        // try next
      }
    }
    throw new Error('Could not start camera')
  }

  async function pickBackCameraId(getCameras) {
    const cameras = await getCameras()
    if (!cameras.length) return undefined
    const back = cameras.find((c) => /back|rear|environment/i.test(c.label))
    return (back || cameras[cameras.length - 1]).id
  }

  global.utils = {
    ZONE,
    COPY,
    RENTED_STATUSES,
    formatTimer,
    formatFreeWait,
    formatCost,
    formatDate,
    formatDateTime,
    tariffLabel,
    parseScooterNumberFromQr,
    walkMinutesFromCenter,
    batteryTone,
    isRented,
    isPackageTariff,
    playBeep,
    escapeHtml,
    cameraErrorMessage,
    getCameraStream,
    pickBackCameraId,
  }
})(window)
