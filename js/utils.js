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

  function normalizeScooterToken(value) {
    if (!value) return null
    const compact = String(value).trim().replace(/[\s_-]+/g, '').toUpperCase()
    if (/^[A-Z]{2}\d{3}[A-Z]$/.test(compact)) return compact
    return null
  }

  function parseScooterNumberFromQr(text) {
    if (!text) return null
    const raw = String(text).trim()
    if (!raw) return null

    const direct = normalizeScooterToken(raw)
    if (direct) return direct

    const idMatch = raw.match(/([A-Z]{2})\s*[-_.]?\s*(\d{3})\s*[-_.]?\s*([A-Z])/i)
    if (idMatch) {
      return `${idMatch[1]}${idMatch[2]}${idMatch[3]}`.toUpperCase()
    }

    if (raw.startsWith('{') || raw.startsWith('[')) {
      try {
        const data = JSON.parse(raw)
        const keys = ['number', 'scooter', 'scooter_id', 'scooterId', 'id', 'device_id', 'deviceId']
        for (const key of keys) {
          const fromJson = normalizeScooterToken(data && data[key])
          if (fromJson) return fromJson
        }
      } catch {
        // not JSON
      }
    }

    const colonTail = raw.split(':').pop()
    const fromColon = normalizeScooterToken(colonTail)
    if (fromColon) return fromColon

    try {
      const url = new URL(raw)
      const paramKeys = ['number', 'id', 'scooter', 'scooter_id', 'scooterId', 'device_id', 'deviceId', 'vehicle_id', 'vehicleId', 'imei']
      for (const key of paramKeys) {
        const value = url.searchParams.get(key)
        if (!value) continue
        const fromParam = normalizeScooterToken(value)
        if (fromParam) return fromParam
        const cleaned = value.trim().toUpperCase()
        if (/^[A-Z0-9-]{4,16}$/.test(cleaned)) return cleaned
      }

      const pathParts = url.pathname.split('/').filter(Boolean)
      for (let i = pathParts.length - 1; i >= 0; i -= 1) {
        const part = decodeURIComponent(pathParts[i])
        const fromPath = normalizeScooterToken(part)
        if (fromPath) return fromPath
        const cleaned = part.trim().toUpperCase()
        if (/^[A-Z0-9-]{4,16}$/.test(cleaned)) return cleaned
      }
    } catch {
      // not a URL
    }

    return normalizeScooterToken(raw)
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

  const SCOOTER_UNLOCKED_SRC = 'assets/scooter-unlocked.mp3?v=3'

  let sharedAudioCtx = null
  let unlockedBufferPromise = null
  let unlockedHtmlAudio = null

  function getAudioContext() {
    if (!sharedAudioCtx) sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)()
    return sharedAudioCtx
  }

  async function ensureAudioReady() {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') await ctx.resume()
    return ctx
  }

  function preloadRideSounds() {
    if (!unlockedBufferPromise) {
      unlockedBufferPromise = fetch(SCOOTER_UNLOCKED_SRC)
        .then((res) => {
          if (!res.ok) throw new Error('unlock sound fetch failed')
          return res.arrayBuffer()
        })
        .then((buf) => ensureAudioReady().then((ctx) => ctx.decodeAudioData(buf)))
        .catch(() => null)
    }
    if (!unlockedHtmlAudio) {
      unlockedHtmlAudio = new Audio(SCOOTER_UNLOCKED_SRC)
      unlockedHtmlAudio.preload = 'auto'
      unlockedHtmlAudio.load()
    }
    return unlockedBufferPromise
  }

  function playScooterUnlockedHtml() {
    try {
      if (!unlockedHtmlAudio) {
        unlockedHtmlAudio = new Audio(SCOOTER_UNLOCKED_SRC)
        unlockedHtmlAudio.preload = 'auto'
      }
      unlockedHtmlAudio.currentTime = 0
      void unlockedHtmlAudio.play()
    } catch {
      // audio not available
    }
  }

  async function playScooterUnlocked() {
    try {
      const ctx = await ensureAudioReady()
      const buffer = unlockedBufferPromise ? await unlockedBufferPromise : await preloadRideSounds()
      if (!buffer) {
        playScooterUnlockedHtml()
        return
      }
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(0)
    } catch {
      playScooterUnlockedHtml()
    }
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
      void playScooterUnlocked()
      return
    }
    void ensureAudioReady().then((ctx) => {
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
    }).catch(() => {})
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function isCameraPermissionError(err) {
    const name = err && err.name
    return name === 'NotAllowedError'
      || name === 'PermissionDeniedError'
      || Boolean(err && err._needsGesture)
  }

  async function queryCameraPermissionState() {
    if (!navigator.permissions || typeof navigator.permissions.query !== 'function') return 'unknown'
    try {
      const status = await navigator.permissions.query({ name: 'camera' })
      return status.state
    } catch {
      return 'unknown'
    }
  }

  function hasPendingCameraRequest() {
    return Boolean(pendingScanStream || pendingScanStreamPromise)
  }

  function cameraPermissionPromptMessage(state) {
    if (!isCameraSupported()) {
      return 'Camera needs HTTPS or localhost. On this phone open http://127.0.0.1:8080 (not a Wi‑Fi IP).'
    }
    if (state === 'denied') {
      return 'Camera is blocked. Tap «Allow camera» to try again, or enable camera for this site in browser settings.'
    }
    return 'Tap «Allow camera» — the browser will ask for permission.'
  }

  function cameraErrorMessage(err) {
    if (!isCameraSupported()) {
      return 'Camera needs HTTPS or localhost. On phone use http://127.0.0.1:8080 (same device) or enable HTTPS. You can enter the number manually.'
    }
    if (err && err._needsGesture) {
      return cameraPermissionPromptMessage('prompt')
    }
    const name = err && err.name
    const msg = err && err.message ? String(err.message) : ''
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return cameraPermissionPromptMessage('denied')
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'No camera found on this device.'
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Camera is busy. Close other apps using it and try again.'
    }
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
      return 'Camera settings not supported on this device. Try reload or enter the number manually.'
    }
    if (name === 'NotSupportedError' || name === 'SecurityError') {
      return 'Camera blocked: use HTTPS, localhost, or enter the number manually.'
    }
    if (msg.includes('secure') || msg.includes('HTTPS') || msg.includes('Secure')) {
      return 'Camera requires HTTPS or localhost — not a plain http://192.168.x.x URL.'
    }
    if (msg && !/html5-qrcode/i.test(msg)) {
      return msg.length > 140 ? `${msg.slice(0, 137)}…` : msg
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
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
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

  let pendingScanStream = null
  let pendingScanStreamPromise = null

  /** Call synchronously from a click/tap — starts a fresh permission request. */
  function requestCameraStreamOnGesture() {
    if (!isCameraSupported()) return null
    releasePendingCameraStream()
    pendingScanStreamPromise = getCameraStream()
      .then((stream) => {
        pendingScanStream = stream
        return stream
      })
      .catch((err) => {
        pendingScanStreamPromise = null
        pendingScanStream = null
        throw err
      })
    return pendingScanStreamPromise
  }

  function reserveCameraStreamOnGesture() {
    requestCameraStreamOnGesture()
  }

  function releasePendingCameraStream() {
    if (pendingScanStream) {
      pendingScanStream.getTracks().forEach((track) => track.stop())
      pendingScanStream = null
    }
    pendingScanStreamPromise = null
  }

  async function getCameraStreamForScan(options = {}) {
    const { requireGesture = false } = options

    if (pendingScanStream) {
      const stream = pendingScanStream
      pendingScanStream = null
      pendingScanStreamPromise = null
      return stream
    }

    if (pendingScanStreamPromise) {
      return await pendingScanStreamPromise
    }

    if (requireGesture) {
      const err = new DOMException('Camera requires a user gesture', 'NotAllowedError')
      err._needsGesture = true
      throw err
    }

    const permission = await queryCameraPermissionState()
    if (permission === 'granted') {
      return getCameraStream()
    }

    const err = new DOMException('Camera requires a user gesture', 'NotAllowedError')
    err._needsGesture = true
    if (permission === 'denied') err._permissionDenied = true
    throw err
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
    preloadRideSounds,
    escapeHtml,
    profileInitials,
    AVATAR_COLOR_OPTIONS,
    cameraErrorMessage,
    isCameraSupported,
    isCameraPermissionError,
    queryCameraPermissionState,
    cameraPermissionPromptMessage,
    hasPendingCameraRequest,
    getCameraStream,
    requestCameraStreamOnGesture,
    reserveCameraStreamOnGesture,
    releasePendingCameraStream,
    getCameraStreamForScan,
  }
})(window)
