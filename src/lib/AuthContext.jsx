import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getProfile } from './db'
import { setRole, clearRole } from './auth'

const Ctx = createContext(null)

export function useAuth() {
  return useContext(Ctx)
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(uid) {
    try {
      const p = await getProfile(uid)
      setProfile(p)
      if (p?.role) setRole(p.role)
      return p
    } catch {
      return null
    }
  }

  // Track the session. Don't await supabase calls inside the auth callback
  // (it holds a lock) — load the profile in the effect below instead.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) {
      setProfile(null)
      return
    }
    loadProfile(uid)
  }, [session?.user?.id])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    refreshProfile: () => (session?.user ? loadProfile(session.user.id) : null),
    signOut: async () => {
      await supabase.auth.signOut()
      clearRole()
      setProfile(null)
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
