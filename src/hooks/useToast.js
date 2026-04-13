import { useState, useRef, useCallback, useEffect } from 'react'

export function useToast(duration = 5000) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  // Nettoyage au démontage : évite les setState sur composant démonté
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const showToast = useCallback((msg, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ msg, type })
    timerRef.current = setTimeout(() => setToast(null), duration)
  }, [duration])

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  return { toast, showToast, dismissToast }
}
