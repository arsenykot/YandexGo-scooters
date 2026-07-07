/** Live QR scanner: getUserMedia video + BarcodeDetector and/or jsQR */
;(function (global) {
  'use strict'

  const SCAN_INTERVAL_MS = 70
  const CROP_RATIO = 0.82
  const JSQR_MAX_DIM = 800
  const SCAN_SCALES = [1, 0.72, 1.28]

  async function createBarcodeDetector() {
    if (typeof BarcodeDetector === 'undefined') return null
    try {
      const supported = await BarcodeDetector.getSupportedFormats()
      if (!supported.includes('qr_code')) return null
      return new BarcodeDetector({ formats: ['qr_code'] })
    } catch {
      return null
    }
  }

  function getCenterCrop(w, h) {
    const side = Math.floor(Math.min(w, h) * CROP_RATIO)
    return {
      x: Math.floor((w - side) / 2),
      y: Math.floor((h - side) / 2),
      side,
    }
  }

  function decodeWithJsQr(sourceCanvas, sx, sy, side, scale) {
    if (typeof jsQR !== 'function') return null

    const targetSide = Math.max(120, Math.floor(side * scale))
    const downscale = targetSide > JSQR_MAX_DIM ? JSQR_MAX_DIM / targetSide : 1
    const dw = Math.max(1, Math.floor(targetSide * downscale))
    const dh = dw

    const scratch = document.createElement('canvas')
    scratch.width = dw
    scratch.height = dh
    const sctx = scratch.getContext('2d', { willReadFrequently: true })
    if (!sctx) return null

    sctx.drawImage(sourceCanvas, sx, sy, side, side, 0, 0, dw, dh)
    const imageData = sctx.getImageData(0, 0, dw, dh)
    return jsQR(imageData.data, dw, dh, { inversionAttempts: 'attemptBoth' })
  }

  function tryParseDecoded(text) {
    return global.utils.parseScooterNumberFromQr(text)
  }

  /**
   * @param {{ container: HTMLElement, onDecode: (number: string) => void, onError?: (err: unknown) => void }}
   */
  async function createLiveQrScanner({ container, onDecode, onError }) {
    let stopped = false
    let stream = null
    let rafId = 0
    let lastScanAt = 0
    let scanning = false

    const video = document.createElement('video')
    video.setAttribute('playsinline', 'true')
    video.muted = true
    video.autoplay = true
    video.className = 'qr-live-video'

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    container.replaceChildren(video)

    const detector = await createBarcodeDetector()
    const hasJsQr = typeof jsQR === 'function'

    if (!detector && !hasJsQr) {
      const err = new Error('QR decoder not available in this browser')
      if (onError) onError(err)
      return { stop() {} }
    }

    try {
      stream = await global.utils.getCameraStreamForScan()
      if (stopped) {
        stream.getTracks().forEach((track) => track.stop())
        return { stop() {} }
      }
      video.srcObject = stream
      await video.play()
    } catch (err) {
      if (onError) onError(err)
      return { stop() {} }
    }

    function handleDecodedText(text) {
      const num = tryParseDecoded(text)
      if (!num) return false
      onDecode(num)
      return true
    }

    async function decodeFrame() {
      if (scanning || stopped) return
      const w = video.videoWidth
      const h = video.videoHeight
      if (!w || !h) return

      scanning = true
      try {
        canvas.width = w
        canvas.height = h
        ctx.drawImage(video, 0, 0, w, h)

        if (detector) {
          try {
            const codes = await detector.detect(canvas)
            for (const code of codes) {
              if (handleDecodedText(code.rawValue)) return
            }
          } catch {
            // BarcodeDetector failed — fall through to jsQR
          }
        }

        if (!hasJsQr) return

        const crop = getCenterCrop(w, h)
        for (const scale of SCAN_SCALES) {
          const result = decodeWithJsQr(canvas, crop.x, crop.y, crop.side, scale)
          if (!result || !result.data) continue
          if (handleDecodedText(result.data)) return
        }

        // Full frame fallback when QR is near edges
        const fullSide = Math.min(w, h)
        const fullResult = decodeWithJsQr(canvas, Math.floor((w - fullSide) / 2), Math.floor((h - fullSide) / 2), fullSide, 0.85)
        if (fullResult && fullResult.data) handleDecodedText(fullResult.data)
      } catch {
        // keep scanning on decode errors
      } finally {
        scanning = false
      }
    }

    function tick() {
      if (stopped) return
      rafId = requestAnimationFrame(tick)
      if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return
      const now = Date.now()
      if (now - lastScanAt < SCAN_INTERVAL_MS) return
      lastScanAt = now
      void decodeFrame()
    }

    rafId = requestAnimationFrame(tick)

    return {
      getVideoTrack() {
        return stream ? stream.getVideoTracks()[0] : null
      },
      stop() {
        stopped = true
        if (rafId) cancelAnimationFrame(rafId)
        if (stream) stream.getTracks().forEach((track) => track.stop())
        stream = null
        video.srcObject = null
        container.replaceChildren()
      },
    }
  }

  global.qrScanner = { createLiveQrScanner }
})(window)
