import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [roleData, setRoleData] = useState(null)
  const [loading, setLoading] = useState(true)
  const isRecovery = useRef(false)

  const loadProfile = useCallback(async (userId) => {
    try {
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error || !prof) return

      setProfile(prof)

      if (prof.role === 'travailleur') {
        const { data } = await supabase.from('workers').select('*').eq('id', userId).maybeSingle()
        setRoleData(data ?? null)
      } else if (prof.role === 'entreprise') {
        const { data } = await supabase.from('companies').select('*').eq('id', userId).maybeSingle()
        setRoleData(data ?? null)
      }
    } catch (err) {
      console.error('[AuthContext] loadProfile error:', err)
    }
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        isRecovery.current = false
        setUser(null)
        setProfile(null)
        setRoleData(null)
        setLoading(false)
        return
      }
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const run = async () => {
      await loadProfile(user.id)
      if (!cancelled) setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (!session?.user) setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const register = async ({ email, password, role, firstName, lastName, companyName, phone, siret, city, radiusKm }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            first_name: firstName || '',
            last_name: lastName || '',
            company_name: companyName || '',
            phone: phone || null,
            siret: siret || null,
            city: city || null,
            radius_km: radiusKm ? parseInt(radiusKm, 10) : 10,
          },
        },
      })
      return error ? { error } : { data, error: null }
    } catch (e) {
      return { error: { message: e.message } }
    }
  }

  const login = async ({ email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      return { data, error }
    } catch (e) {
      return { error: { message: e.message } }
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('[AuthContext] logout error:', err)
      setUser(null)
      setProfile(null)
      setRoleData(null)
    }
  }

  const refreshRoleData = async () => {
    if (user) await loadProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      roleData,
      loading,
      isWorker: profile?.role === 'travailleur',
      isCompany: profile?.role === 'entreprise',
      isAdmin: profile?.role === 'admin',
      register,
      login,
      logout,
      refreshRoleData,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
