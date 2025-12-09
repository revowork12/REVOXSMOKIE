# 🔐 SECURE AUTHENTICATION SETUP FOR SMOKIES

## 🎯 RECOMMENDED APPROACH: Use Supabase Built-in Auth

### ✅ **Best Practice: Supabase Authentication**

Instead of custom login tables, use Supabase's built-in authentication system:

#### 1. **Enable Supabase Auth:**
```javascript
// In your Supabase dashboard:
// 1. Go to Authentication → Settings
// 2. Enable "Enable email confirmations" (optional)
// 3. Set up your site URL
// 4. Configure any providers you want (Google, etc.)
```

#### 2. **Create Owner Account:**
```javascript
// Use Supabase dashboard or this code to create owner account
import { supabase } from '@/lib/supabase'

// Create owner account (run this once)
const createOwnerAccount = async () => {
  const { data, error } = await supabase.auth.signUp({
    email: 'your-email@domain.com',
    password: 'your-secure-password-here',
    options: {
      data: {
        role: 'owner',
        shop_name: 'Smokies Restaurant'
      }
    }
  })
  
  if (error) console.error('Error:', error)
  else console.log('Owner created:', data)
}
```

#### 3. **Create Secure Login Component:**
```typescript
// components/auth/OwnerLogin.tsx
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OwnerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      alert('Login failed: ' + error.message)
    } else {
      // Check if user has owner role
      if (data.user?.user_metadata?.role === 'owner') {
        router.push('/dashboard')
      } else {
        alert('Access denied: Owner account required')
        await supabase.auth.signOut()
      }
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Owner Login
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

#### 4. **Protect Dashboard Route:**
```typescript
// middleware.ts (create this file in project root)
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If accessing dashboard without session, redirect to login
  if (req.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // If accessing dashboard, check owner role
  if (req.nextUrl.pathname.startsWith('/dashboard') && session) {
    const userRole = session.user?.user_metadata?.role
    if (userRole !== 'owner') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

#### 5. **Auth Context for App:**
```typescript
// lib/auth-context.tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  isOwner: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isOwner: false
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  const isOwner = user?.user_metadata?.role === 'owner'

  return (
    <AuthContext.Provider value={{ user, loading, isOwner }}>
      {children}
    </AuthContext.Provider>
  )
}
```

## 🔒 **SECURITY BENEFITS:**

✅ **No hardcoded credentials** in your code  
✅ **Encrypted password storage** by Supabase  
✅ **JWT tokens** for secure sessions  
✅ **Automatic session management**  
✅ **Built-in security** features  
✅ **Role-based access** control  
✅ **Easy password reset** functionality  

## 🚫 **NEVER DO THIS:**
```javascript
// ❌ NEVER hardcode credentials
const OWNER_EMAIL = "admin@smokies.com"
const OWNER_PASSWORD = "password123"
```

## ✅ **SETUP STEPS:**

1. **Run the shop management SQL** (`tmp_rovodev_shop_management_only.sql`)
2. **Create owner account** via Supabase dashboard or signup code
3. **Add the login component** to your app
4. **Add middleware** for route protection
5. **Wrap your app** with AuthProvider
6. **Set environment variables** (if any needed)

**This approach is enterprise-grade secure and follows industry best practices!** 🔐