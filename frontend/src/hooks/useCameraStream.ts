import { useCallback, useEffect, useRef, useState } from 'react'
import { cameraErrorMessage, getCameraStream } from '../utils/camera'

export function useCameraStream() {
  const streamRef = useRef<MediaStream | null>(null)
  const videoNodeRef = useRef<HTMLVideoElement | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bindVideo = useCallback((node: HTMLVideoElement | null) => {
    videoNodeRef.current = node
    if (node && streamRef.current) {
      node.srcObject = streamRef.current
      void node.play().catch(() => {})
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const stream = await getCameraStream()
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoNodeRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => {})
        }
        setActive(true)
        setError(null)
      } catch (e) {
        if (!cancelled) {
          setError(cameraErrorMessage(e))
          setActive(false)
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (videoNodeRef.current) {
        videoNodeRef.current.srcObject = null
      }
    }
  }, [])

  return { videoRef: bindVideo, active, error }
}
