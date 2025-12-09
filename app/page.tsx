'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to customer home page with SMOKIES branding
    router.push('/customer/home')
  }, [router])
  
  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-secondary mx-auto mb-6"></div>
        <p className="text-secondary text-xl font-semibold tracking-wide">Loading SMOKIES...</p>
      </div>
    </div>
  )
}