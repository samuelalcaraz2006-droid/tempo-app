import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { captureError } from '../lib/sentry'

export const AuthContext = createContext(null)
// eslint-disable-next-line react-refresh/only-export-components

export const AuthProvider = ({ children }) => {
  const [user, setUser]             = useState(null)
  const [profile, setProfile]       = useState(null)
  const [roleData, setRoleData]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [recovering, setRecovering] = useState(false)
  const isRecovery = useRef(false)

  // God Mode impersonation
  // null         → admin lands on the picker
  // 'admin'      → view as real admin
  // { role, targetId, profile, roleData } → impersonating a worker/company
  const [viewAs, setViewAs] = useState(null)

  // ── Chargement du profil (séparé de onAuthStateChange) ────
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
      captureError(err, { source: 'AuthContext.loadProfile' })
    }
  }, [])

  // ── 1. onAuthStateChange : met à jour UNIQUEMENT user ─────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        isRecovery.current = true
        setUser(session?.user ?? null)
        setRecovering(true)
        return
      }

      if (event === 'SIGNED_IN' && isRecovery.current) {
        return  // ignore le SIGNED_IN post-recovery, attendre USER_UPDATED
      }

      if (event === 'USER_UPDATED') {
        isRecovery.current = false
        setRecovering(false)
        // Recharger le profil explicitement car user.id n'a pas changé
        if (session?.user) loadProfile(session.user.id)
      }

      if (event === 'SIGNED_OUT') {
        isRecovery.current = false
        setRecovering(false)
        setUser(null)
        setProfile(null)
        setRoleData(null)
        setViewAs(null)
        setLoading(false)
        return
      }

      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── 2. Quand user change → charger le profil ─────────────
  // Note : ne pas appeler setLoading(false) quand user est null ici —
  // c'est getSession() (effet 3) ou SIGNED_OUT (effet 1) qui gèrent ce cas.
  // Évite la race condition où loading passe à false avant que getSession
  // n'ait confirmé l'absence de session.
  // loadProfile est stable (useCallback sans deps) — exclure de la liste
  // pour éviter que chaque re-render de loadProfile relance l'effet.
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

  // ── 3. Session initiale au chargement ─────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (!session?.user) setLoading(false)
      // si user présent, le useEffect[user?.id] prend le relais
    }).catch(() => setLoading(false))
  }, [])

  const register = async ({ email, password, role, firstName, lastName, companyName, phone, siret, city, radiusKm }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
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
          }
        }
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
    // Nettoyer les donnees utilisateur du localStorage
    const tempoKeys = Object.keys(localStorage).filter(k => k.startsWith('tempo_'))
    tempoKeys.forEach(k => localStorage.removeItem(k))
    setViewAs(null)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      captureError(err, { source: 'AuthContext.logout' })
      // Forcer le reset local meme si signOut echoue
      setUser(null)
      setProfile(null)
      setRoleData(null)
    }
  }

  const refreshRoleData = async () => {
    if (!user) return
    if (viewAs && typeof viewAs === 'object' && viewAs.targetId) {
      const table = viewAs.role === 'travailleur' ? 'workers' : 'companies'
      const [{ data: prof }, { data: role }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', viewAs.targetId).maybeSingle(),
        supabase.from(table).select('*').eq('id', viewAs.targetId).maybeSingle(),
      ])
      setViewAs(v => (v && typeof v === 'object' ? { ...v, profile: prof, roleData: role } : v))
      return
    }
    await loadProfile(user.id)
  }

  // Admin prend l'identite d'un travailleur ou d'une entreprise
  const impersonate = useCallback(async (role, targetId) => {
    const table = role === 'travailleur' ? 'workers' : 'companies'
    const [{ data: prof }, { data: roleRow }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', targetId).maybeSingle(),
      supabase.from(table).select('*').eq('id', targetId).maybeSingle(),
    ])
    setViewAs({ role, targetId, profile: prof, roleData: roleRow })
  }, [])

  const viewAsAdmin = useCallback(() => setViewAs('admin'), [])
  const resetView   = useCallback(() => setViewAs(null), [])

  // ── Valeurs "effectives" exposees a l'app ──────────────────
  const isImpersonating = viewAs && typeof viewAs === 'object'
  const effectiveProfile  = isImpersonating ? viewAs.profile  : profile
  const effectiveRoleData = isImpersonating ? viewAs.roleData : roleData
  const effectiveUser = isImpersonating && user
    ? { ...user, id: viewAs.targetId, email: viewAs.profile?.email || user.email }
    : user

  // Pour un admin en God Mode :
  //  - viewAs === null        → defaut admin (la page App.jsx intercepte
  //    avant le rendu et affiche le picker)
  //  - viewAs === 'admin'     → admin
  //  - isImpersonating        → role cible (travailleur / entreprise)
  const effectiveRole = (() => {
    if (!profile) return null
    if (profile.role !== 'admin') return profile.role
    if (isImpersonating) return viewAs.role
    return 'admin'
  })()

  return (
    <AuthContext.Provider value={{
      user:       effectiveUser,
      profile:    effectiveProfile,
      roleData:   effectiveRoleData,
      loading, recovering,
      isWorker:   effectiveRole === 'travailleur',
      isCompany:  effectiveRole === 'entreprise',
      isAdmin:    effectiveRole === 'admin',
      isVerified: effectiveProfile?.status === 'verified',
      register, login, logout, refreshRoleData,

      // God Mode API
      realUser:       user,
      realProfile:    profile,
      canImpersonate: profile?.role === 'admin',
      viewAs,
      isImpersonating,
      impersonate,
      viewAsAdmin,
      resetView,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
