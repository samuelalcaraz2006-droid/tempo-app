import { useState, useEffect } from 'react'

const STORAGE_KEY = 'tempo_dark_mode'

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem(STORAGE_KEY, darkMode ? '1' : '0')
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode(prev => !prev)

  return { darkMode, setDarkMode, toggleDarkMode }
}
