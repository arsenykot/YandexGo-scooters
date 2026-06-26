import { useCallback, useState } from 'react'

export function useToast() {
  const [message, setMessage] = useState<string | null>(null)

  const show = useCallback((text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(null), 2500)
  }, [])

  return { message, show }
}
