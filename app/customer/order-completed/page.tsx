'use client'
import Link from 'next/link'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { COLORS } from '@/lib/constants'

function OrderCompletedContent() {
  const searchParams = useSearchParams()
  const [showContent, setShowContent] = useState(false)
  const [orderNumber, setOrderNumber] = useState<number | null>(null)
  const [verificationNumber, setVerificationNumber] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Basic parameter validation
    console.log('Order completed page loaded with params:', Object.fromEntries(searchParams))

    const orderNumberParam = searchParams.get('orderNumber')
    const verificationNumberParam = searchParams.get('verificationNumber')

    if (!orderNumberParam || !verificationNumberParam) {
      // Redirect to menu if no order data
      window.location.href = '/customer/menu'
      return
    }

    // Simple number parsing instead of security manager
    const parsedOrderNumber = parseInt(orderNumberParam)
    const parsedVerificationNumber = parseInt(verificationNumberParam)

    console.log('Parsing numbers:', { orderNumberParam, verificationNumberParam, parsedOrderNumber, parsedVerificationNumber })

    if (isNaN(parsedOrderNumber) || isNaN(parsedVerificationNumber)) {
      console.warn('Invalid number format in parameters')
      window.location.href = '/customer/menu'
      return
    }

    // Set order info immediately - no slow database verification for fast loading
    setOrderNumber(parsedOrderNumber)
    setVerificationNumber(parsedVerificationNumber)
    
    // Show content immediately - no delay
    setShowContent(true)
  }, [searchParams])

  const handleOrderAgain = () => {
    // Simple fast navigation - no slow localStorage cleanup
    window.location.href = '/customer/menu'
  }

  if (!orderNumber || !verificationNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-secondary mx-auto mb-6" aria-label="Loading"></div>
          <p className="text-secondary font-semibold text-lg tracking-wide">Verifying order completion...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        {/* Success Content with Animation */}
        <div 
          className={`transition-all duration-1000 ${
            showContent 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-8 scale-95'
          }`}
        >
          {/* Success Icon */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-green-500 rounded-full mb-6 animate-pulse shadow-xl" role="img" aria-label="Order completed">
              <span className="text-5xl text-white" aria-hidden="true">✓</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-black text-secondary mb-8 uppercase tracking-wider">
            ORDER COMPLETED
          </h1>

          {/* Success Message Card */}
          <div className="bg-white/95 rounded-2xl p-8 shadow-xl border border-secondary/30 mb-8 backdrop-blur-sm">
            {/* Main Message */}
            <h2 className="text-2xl font-bold text-secondary mb-6">
              <span role="img" aria-label="celebration">🎉</span> Your order is completed
            </h2>

            {/* Sub-message */}
            <p className="text-lg text-secondary/80 leading-relaxed font-medium">
              A heartfelt thank-you from <strong>Team Smokies Hamburger</strong>
            </p>

            {/* Visit Again Message */}
            <div className="mt-6">
              <p className="text-lg font-bold text-secondary">
                Please Visit Again!!
              </p>
              <p className="text-md text-secondary/70 font-semibold tracking-wide">
                <strong>WED</strong> - <strong>MON</strong>, <strong>5pm</strong> Onwards
              </p>
            </div>

            {/* Order Reference */}
            <div className="mt-6 pt-6 border-t border-secondary/30">
              <p className="text-sm text-secondary/60 font-medium">
                Order #{orderNumber} • Verification {verificationNumber}
              </p>
            </div>
          </div>

          {/* Order Again Button */}
          <div className="text-center">
            <button
              onClick={handleOrderAgain}
              className="inline-block bg-accent text-white hover:bg-accent/90 active:bg-accent/80 px-10 py-4 rounded-xl font-bold text-xl hover:scale-105 active:scale-95 hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 uppercase tracking-wide shadow-lg"
              role="button"
              aria-label="Start a new order"
            >
              Order Again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderCompleted() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-center">
          <div className="animate-pulse text-5xl mb-6">🎉</div>
          <p className="text-secondary font-semibold text-lg tracking-wide">Almost there...</p>
        </div>
      </div>
    }>
      <div className="order-completed-page">
        <OrderCompletedContent />
      </div>
    </Suspense>
  )
}