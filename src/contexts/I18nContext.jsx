import React, { createContext, useContext, useState, useCallback } from 'react'
import fr from '../lib/i18n/fr'
import en from '../lib/i18n/en'

const translations = { fr, en }
const I18nContext = createContext()

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => localStorage.getItem('tempo_locale') || 'fr')

  const switchLocale = useCallback((loc) => {
    setLocale(loc)
    localStorage.setItem('tempo_locale', loc)
  }, [])

  const t = useCallback((key) => {
    return translations[locale]?.[key] || translations.fr[key] || key
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, switchLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
