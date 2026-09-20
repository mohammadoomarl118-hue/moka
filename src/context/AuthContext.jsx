import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } =
        await supabase.auth.getSession()

      if (error) {
        console.error('GET SESSION ERROR:', error)
      }

      if (mounted) {
        setUser(data?.session?.user ?? null)
        setLoading(false)
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  async function signUp(email, password) {
    const { data, error } =
      await supabase.auth.signUp({
        email,
        password,
      })

    if (error) throw error

    return data
  }

  async function signIn(email, password) {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (error) throw error

    return data
  }

  async function signOut() {
    const { error } =
      await supabase.auth.signOut()

    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}