'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { COLORS } from '@/lib/constants'
import { OrderSystem, type OrderData } from '@/lib/orderSystem'
import { SecurityManager } from '@/lib/security'

export default function OrderNumber() {
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [showNumbers, setShowNumbers] = useState(false)
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') return

    // Security: Check rate limiting for order creation
    const clientId = SecurityManager.generateSecureToken().slice(0, 16) // Use first 16 chars as client ID
    if (!SecurityManager.checkOrderCreationRateLimit(clientId)) {
      console.warn('Security: Order creation rate limit exceeded')
      alert('Too many orders created recently. Please wait a moment before creating another order.')
      window.location.href = '/customer/menu'
      return
    }

    // Get the actual order from Supabase (should be passed from order-summary page)
    try {
      // Get order data from URL params or localStorage
      const urlParams = new URLSearchParams(window.location.search)
      const orderNumber = urlParams.get('orderNumber')
      const verificationNumber = urlParams.get('verificationNumber')
      
      if (orderNumber && verificationNumber) {
        // Use actual order data from database
        setOrderData({
          orderNumber: parseInt(orderNumber),
          verificationNumber: parseInt(verificationNumber),
          timestamp: new Date().toISOString()
        })
      } else {
        // Try to get from localStorage (set by order-summary page)
        const savedOrder = localStorage.getItem('lastOrderData')
        if (savedOrder) {
          const orderData = JSON.parse(savedOrder)
          setOrderData({
            orderNumber: orderData.order_number,
            verificationNumber: orderData.verification_number,
            timestamp: orderData.created_at || new Date().toISOString()
          })
          // Clear the saved order
          localStorage.removeItem('lastOrderData')
        } else {
          // Fallback - this shouldn't happen in normal flow
          console.warn('No order data found - user may have navigated directly to this page')
          setOrderData({
            orderNumber: 1,
            verificationNumber: 10000,
            timestamp: new Date().toISOString()
          })
        }
      }
    } catch (error) {
      console.error('Failed to load order data:', error)
      // Fallback order data
      setOrderData({
        orderNumber: 1,
        verificationNumber: 10000,
        timestamp: new Date().toISOString()
      })
    }

    // Trigger fade-in animations
    const numberTimer = setTimeout(() => {
      setShowNumbers(true)
    }, 455)

    // Show button after 1.7 seconds with slide-up animation
    const buttonTimer = setTimeout(() => {
      setShowButton(true)
      console.log('Track Order button should now be visible!')
    }, 1700)

    return () => {
      clearTimeout(numberTimer)
      clearTimeout(buttonTimer)
    }
  }, [])

  return (
    <div className="min-h-screen bg-primary">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Animation/Icon */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-green-500 rounded-full mb-6 animate-pulse shadow-xl" role="img" aria-label="Order confirmed">
              <span className="text-5xl text-white" aria-hidden="true">✓</span>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-4xl md:text-5xl font-black text-secondary mb-12 uppercase tracking-wider">
            ORDER CONFIRMED
          </h1>

          {/* Order Information Card */}
          <div className="bg-white/95 rounded-2xl p-8 shadow-xl border border-secondary/30 mb-8 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-secondary mb-8">
              <span role="img" aria-label="celebration">🎉</span> Thank you for your order!
            </h2>
            <p className="text-lg text-secondary/80 mb-12 font-medium leading-relaxed">
              Your delicious order has been placed successfully. Our team will prepare it with love and care!
            </p>

            {/* Order Numbers with Fade-in Animation */}
            <div className={`space-y-8 transition-all duration-1000 ${showNumbers ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {/* Order Number */}
              <div className="bg-secondary/10 rounded-xl p-6 border-2 border-secondary/30">
                <div className="text-sm font-bold text-secondary/70 uppercase tracking-wider mb-2">
                  Order Number
                </div>
                <div className="text-4xl font-black text-accent" aria-label={`Order number ${orderData?.orderNumber}`}>
                  #{orderData?.orderNumber || '---'}
                </div>
              </div>

              {/* Verification Number */}
              <div className="bg-secondary/10 rounded-xl p-6 border-2 border-secondary/30">
                <div className="text-sm font-bold text-secondary/70 uppercase tracking-wider mb-2">
                  Verification Number
                </div>
                <div className="text-4xl font-black text-accent" aria-label={`Verification number ${orderData?.verificationNumber}`}>
                  {orderData?.verificationNumber || '-----'}
                </div>
              </div>
            </div>
          </div>

          {/* Track Order Button with Slide-up Animation */}
          <div 
            className={`text-center transition-all duration-500 ${
              showButton 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            {/* Track Order Button */}
            <Link
              href={`/customer/order-tracking?orderNumber=${orderData?.orderNumber}&verificationNumber=${orderData?.verificationNumber}`}
              className="inline-block bg-accent hover:bg-accent/90 active:bg-accent/80 px-10 py-4 rounded-xl font-bold text-white hover:scale-105 active:scale-95 hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/50 shadow-lg tracking-wide text-lg"
              role="button"
              aria-label="Track your order status"
            >
              Track Order
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}