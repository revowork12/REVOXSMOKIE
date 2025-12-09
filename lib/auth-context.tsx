'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (emailOrUsername: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      if (!supabase) return
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    if (!supabase) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (emailOrUsername: string, password: string) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } }
    
    console.log('🔐 Attempting REVOXSMOKIES login with:', emailOrUsername)
    
    try {
      // Check if input is email format or username
      let email = emailOrUsername
      
      // If it's not an email format, convert username to email
      if (!emailOrUsername.includes('@')) {
        // Convert username to email format for Supabase Auth
        email = `${emailOrUsername}@smokieshamburgers.com`
      }
      
      console.log('🔍 Attempting login with email:', email)
      
      // Use real Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      })
      
      if (error) {
        console.log('❌ Supabase auth error:', error.message)
        return { error }
      }
      
      if (data.user && data.session) {
        console.log('✅ Supabase authentication successful!')
        setUser(data.user)
        setSession(data.session)
        return { error: null }
      }
      
      return { error: { message: 'Authentication failed' } }
      
    } catch (error) {
      console.error('❌ Auth error:', error)
      return { error: { message: 'Authentication error occurred' } }
    }
  }

  const signOut = async () => {
    if (!supabase) return
    
    try {
      console.log('🚪 Signing out from REVOXSMOKIES...')
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ Sign out error:', error)
      } else {
        console.log('✅ Successfully signed out')
        setUser(null)
        setSession(null)
      }
    } catch (error) {
      console.error('❌ Sign out error:', error)
    }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}