export function isCameraSupported(): boolean {
  return Boolean(
    typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function',
  )
}

export function cameraErrorMessage(err: unknown): string {
  if (!isCameraSupported()) {
    return 'Camera needs a secure context. Open http://localhost:5173 (not a file or raw IP without HTTPS).'
  }
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') {
      return 'Camera access denied. Allow it in browser settings and reload.'
    }
    if (err.name === 'NotFoundError') {
      return 'No camera found on this device.'
    }
    if (err.name === 'NotReadableError') {
      return 'Camera is busy. Close other apps using it and reload.'
    }
  }
  return 'Could not start the camera. Try reload or enter the scooter number.'
}

/** Tries rear camera first, then any available camera (important on desktop). */
export async function getCameraStream(): Promise<MediaStream> {
  if (!isCameraSupported()) {
    throw new DOMException('Camera not supported', 'NotSupportedError')
  }

  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: { ideal: 'environment' } }, audio: false },
    { video: { facingMode: 'user' }, audio: false },
    { video: true, audio: false },
  ]

  let lastError: unknown
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

export async function pickBackCameraId(
  getCameras: () => Promise<{ id: string; label: string }[]>,
): Promise<string | undefined> {
  const cameras = await getCameras()
  if (!cameras.length) return undefined
  const back = cameras.find((c) =>
    /back|rear|environment|задн|тыл/i.test(c.label),
  )
  return back?.id ?? cameras[cameras.length - 1]?.id
}
