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
    scanHint: 'Point at the QR on the handlebars — hold steady, 15–25 cm away',
    scanTip: 'Use flash in low light. Demo fleet: HA538P, HA539B…',
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
    if (!text) return null
    const raw = String(text).trim()
    if (!raw) return null

    const idMatch = raw.match(/\b([A-Z]{2}\d{3}[A-Z])\b/i)
    if (idMatch) return idMatch[1].toUpperCase()

    try {
      const url = new URL(raw)
      const paramKeys = ['number', 'id', 'scooter', 'scooter_id', 'scooterId', 'device_id', 'deviceId', 'vehicle_id', 'vehicleId', 'imei']
      for (const key of paramKeys) {
        const value = url.searchParams.get(key)
        if (!value) continue
        const fromParam = value.match(/\b([A-Z]{2}\d{3}[A-Z])\b/i)
        if (fromParam) return fromParam[1].toUpperCase()
        const cleaned = value.trim().toUpperCase()
        if (/^[A-Z0-9-]{4,16}$/.test(cleaned)) return cleaned
      }

      const pathParts = url.pathname.split('/').filter(Boolean)
      for (let i = pathParts.length - 1; i >= 0; i -= 1) {
        const part = decodeURIComponent(pathParts[i])
        const fromPath = part.match(/\b([A-Z]{2}\d{3}[A-Z])\b/i)
        if (fromPath) return fromPath[1].toUpperCase()
        const cleaned = part.trim().toUpperCase()
        if (/^[A-Z0-9-]{4,16}$/.test(cleaned)) return cleaned
      }
    } catch {
      // not a URL
    }

    const upper = raw.toUpperCase()
    if (/^[A-Z]{2}\d{3}[A-Z]$/.test(upper)) return upper
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
    playRideDong('beep')
  }

  const SCOOTER_UNLOCKED_SRC = 'assets/scooter-unlocked.mp3?v=2'

  let sharedAudioCtx = null
  let scooterUnlockedAudio = null
  let scooterUnlockedLoadedSrc = ''

  function playScooterUnlocked() {
    try {
      if (!scooterUnlockedAudio || scooterUnlockedLoadedSrc !== SCOOTER_UNLOCKED_SRC) {
        scooterUnlockedAudio = new Audio(SCOOTER_UNLOCKED_SRC)
        scooterUnlockedAudio.preload = 'auto'
        scooterUnlockedLoadedSrc = SCOOTER_UNLOCKED_SRC
      }
      scooterUnlockedAudio.currentTime = 0
      void scooterUnlockedAudio.play()
    } catch {
      // audio not available
    }
  }

  function getAudioContext() {
    if (!sharedAudioCtx) sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (sharedAudioCtx.state === 'suspended') void sharedAudioCtx.resume()
    return sharedAudioCtx
  }

  function playTone(ctx, { freq, start, duration, volume = 0.12, type = 'sine' }) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + duration + 0.02)
  }

  function playRideDong(kind) {
    if (kind === 'start') {
      playScooterUnlocked()
      return
    }
    try {
      const ctx = getAudioContext()
      const t = ctx.currentTime
      if (kind === 'unlock') {
        playTone(ctx, { freq: 620, start: t, duration: 0.09, volume: 0.14 })
        playTone(ctx, { freq: 1040, start: t + 0.11, duration: 0.13, volume: 0.12 })
      } else if (kind === 'pause') {
        playTone(ctx, { freq: 520, start: t, duration: 0.16, volume: 0.11, type: 'triangle' })
        playTone(ctx, { freq: 360, start: t + 0.1, duration: 0.2, volume: 0.1, type: 'triangle' })
      } else if (kind === 'resume') {
        playTone(ctx, { freq: 440, start: t, duration: 0.08, volume: 0.11 })
        playTone(ctx, { freq: 660, start: t + 0.09, duration: 0.1, volume: 0.12 })
        playTone(ctx, { freq: 880, start: t + 0.19, duration: 0.14, volume: 0.13 })
      } else if (kind === 'beep') {
        playTone(ctx, { freq: 820, start: t, duration: 0.62, volume: 0.13, type: 'square' })
        playTone(ctx, { freq: 620, start: t + 0.04, duration: 0.58, volume: 0.07, type: 'triangle' })
      } else if (kind === 'finish') {
        playTone(ctx, { freq: 880, start: t, duration: 0.1, volume: 0.12 })
        playTone(ctx, { freq: 620, start: t + 0.12, duration: 0.14, volume: 0.11 })
        playTone(ctx, { freq: 400, start: t + 0.28, duration: 0.22, volume: 0.1, type: 'triangle' })
      }
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
    if (!isCameraSupported()) {
      return 'Camera needs HTTPS or localhost. On phone use http://127.0.0.1:8000 (same device) or enable HTTPS. You can enter the number manually.'
    }
    const name = err && err.name
    const msg = err && err.message ? String(err.message) : ''
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Camera permission denied. Allow camera access or enter the number manually.'
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No camera found on this device.'
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Camera is busy. Close other apps using it and try again.'
    }
    if (name === 'NotSupportedError' || name === 'SecurityError') {
      return 'Camera blocked: use HTTPS, localhost, or enter the number manually.'
    }
    if (msg.includes('secure') || msg.includes('HTTPS') || msg.includes('Secure')) {
      return 'Camera requires HTTPS or localhost — not a plain http://192.168.x.x URL.'
    }
    return 'Could not start the camera. Try reload or enter the scooter number.'
  }

  function isCameraSupported() {
    return Boolean(
      typeof window !== 'undefined'
      && window.isSecureContext
      && navigator.mediaDevices
      && typeof navigator.mediaDevices.getUserMedia === 'function',
    )
  }

  async function getCameraStream() {
    if (!isCameraSupported()) {
      throw new DOMException('Camera requires a secure context', 'SecurityError')
    }
    const constraintsList = [
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      { video: { facingMode: 'user' }, audio: false },
      { video: true, audio: false },
    ]
    let lastError = null
    for (const constraints of constraintsList) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints)
      } catch (e) {
        lastError = e
      }
    }
    throw lastError || new Error('Could not start camera')
  }

  async function pickBackCameraId(getCameras) {
    const cameras = await getCameras()
    if (!cameras.length) return undefined

    const back = cameras.find((c) => /back|rear|environment|задн|тыл/i.test(c.label))
    if (back) return back.id

    const notFront = cameras.filter((c) => !/front|user|selfie|facetime|передн/i.test(c.label))
    if (notFront.length === 1) return notFront[0].id

    // Unlabeled device list — facingMode is more reliable than guessing by index
    const hasLabels = cameras.some((c) => c.label && c.label.trim().length > 0)
    if (!hasLabels) return undefined

    if (notFront.length) return notFront[notFront.length - 1].id
    return undefined
  }

  async function resolveBackCameraDeviceId() {
    const stream = await getCameraStream()
    try {
      const track = stream.getVideoTracks()[0]
      return track && track.getSettings().deviceId
    } finally {
      stream.getTracks().forEach((t) => t.stop())
      // Let the OS release the camera before html5-qrcode opens it again (Android)
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
  }

  /** Build ordered camera candidates for html5-qrcode (device id or constraints). */
  async function buildQrCameraCandidates(getCameras) {
    const candidates = []
    const seen = new Set()
    const add = (value) => {
      if (value == null) return
      const key = typeof value === 'string' ? value : JSON.stringify(value)
      if (seen.has(key)) return
      seen.add(key)
      candidates.push(value)
    }

    try {
      add(await resolveBackCameraDeviceId())
    } catch {
      // same probe as finish-photo — fall through to other options
    }

    add({ facingMode: 'environment' })

    try {
      add(await pickBackCameraId(getCameras))
    } catch {
      // ignore
    }

    try {
      const cameras = await getCameras()
      for (const cam of cameras) {
        if (!/front|user|selfie|facetime|передн/i.test(cam.label)) add(cam.id)
      }
    } catch {
      // ignore
    }

    return candidates
  }

  function getQrScannerConfig() {
    const config = {
      fps: 20,
      qrbox: (width, height) => ({
        width: Math.floor(width * 0.94),
        height: Math.floor(height * 0.76),
      }),
      disableFlip: false,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
      videoConstraints: {
        facingMode: { ideal: 'environment' },
        width: { min: 640, ideal: 1920, max: 2560 },
        height: { min: 480, ideal: 1080, max: 1440 },
      },
    }

    if (typeof Html5QrcodeSupportedFormats !== 'undefined') {
      config.formatsToSupport = [Html5QrcodeSupportedFormats.QR_CODE]
    }

    return config
  }

  function profileInitials(name) {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const AVATAR_COLOR_OPTIONS = [
    { id: 'yellow', label: 'Yellow' },
    { id: 'coral', label: 'Coral' },
    { id: 'blue', label: 'Blue' },
    { id: 'green', label: 'Green' },
    { id: 'purple', label: 'Purple' },
    { id: 'slate', label: 'Slate' },
  ]

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
    playRideDong,
    escapeHtml,
    profileInitials,
    AVATAR_COLOR_OPTIONS,
    cameraErrorMessage,
    isCameraSupported,
    getCameraStream,
    pickBackCameraId,
    resolveBackCameraDeviceId,
    buildQrCameraCandidates,
    getQrScannerConfig,
  }
})(window)
