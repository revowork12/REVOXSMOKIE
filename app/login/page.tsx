'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { COLORS } from '@/lib/constants'

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const { error } = await signIn(emailOrUsername, password)

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-primary">
      <div className="w-full max-w-md">
        <div className="bg-white/95 rounded-2xl p-8 shadow-xl border border-secondary/30 backdrop-blur-sm">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-secondary mb-3 tracking-wide">
              🍔 SMOKIES HAMBURGERS
            </h1>
            <p className="text-secondary/70 font-medium text-sm uppercase tracking-widest">Owner Dashboard Login</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
              <p className="text-accent font-medium text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="emailOrUsername" className="block text-sm font-semibold text-secondary mb-2">
                Username or Email
              </label>
              <input
                id="emailOrUsername"
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                className="w-full px-4 py-3 border border-secondary/30 rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-colors bg-white shadow-sm"
                placeholder="admin or admin@gmail.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-secondary mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-secondary/30 rounded-xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-colors bg-white shadow-sm"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-secondary text-white hover:bg-secondary/90 disabled:bg-secondary/50 disabled:cursor-not-allowed px-6 py-4 rounded-xl font-bold text-lg transition-all duration-200 uppercase tracking-wide shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cream mr-2"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-6 pt-6 border-t border-navy-500/10">
            <p className="text-sm text-navy-500/60">
              Need help? Contact your administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}