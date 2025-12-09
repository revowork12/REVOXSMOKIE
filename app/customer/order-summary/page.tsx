'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface OrderItem {
  id: number
  menu_item_id?: number
  name: string
  price: number
  variant: string
  quantity: number
}

export default function OrderSummaryPage() {
  const router = useRouter()
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    // Get order data from sessionStorage
    const orderDataStr = sessionStorage.getItem('orderData')
    if (orderDataStr) {
      try {
        const orderData = JSON.parse(orderDataStr)
        setOrderItems(orderData.items)
        setTotal(orderData.total)
      } catch (error) {
        console.error('Error parsing order data:', error)
        // Redirect back to menu if invalid data
        router.push('/customer/menu')
      }
    } else {
      // No order data found, redirect to menu
      router.push('/customer/menu')
    }
  }, [])

  const handlePlaceOrder = async () => {
    if (orderItems.length === 0) return

    setIsPlacingOrder(true)
    
    try {
      console.log('🔥 Creating order in REVOXSMOKIES database...')
      
      // Capture the exact IST timestamp when order is placed
      const orderPlacedTimestamp = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
      
      // Store in sessionStorage for the tracking page to use
      sessionStorage.setItem('orderPlacedTimestamp', orderPlacedTimestamp)
      
      // Anonymous ordering - no customer info required
      const customerName = 'Anonymous'
      const customerPhone = ''
      
      // Order data with names and variants for proper API processing
      const orderData = {
        items: orderItems.map(item => ({
          id: item.menu_item_id || item.id,
          name: item.name, // Include name for API parsing
          variant: item.variant, // Include variant for API parsing
          quantity: item.quantity,
          price: item.price
        })),
        customerInfo: {
          name: customerName,
          phone: customerPhone || ''
        },
        totalAmount: total
      }
      
      console.log('📊 Order details:', {
        customerName,
        total,
        itemCount: orderItems.length,
        items: orderData.items
      })
      
      // Use the new API to create the order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.order) {
        throw new Error(result.error || 'Failed to create order')
      }
      
      console.log('✅ Order created:', result.order)
      
      // No customer info to save for anonymous orders
      
      // Save order data for other pages
      const completeOrderData = {
        id: result.order.id,
        order_number: result.order.order_number || result.order.id,
        verification_number: result.order.verification_number,
        status: result.order.status,
        total_amount: result.order.total_amount,
        created_at: result.order.created_at,
        items: orderItems
      }
      localStorage.setItem('lastOrderData', JSON.stringify(completeOrderData))
      
      // Clear the order data from sessionStorage
      sessionStorage.removeItem('orderData')
      sessionStorage.removeItem('customerNotes')
      
      console.log('🚀 Redirecting to order confirmation...')
      
      // Direct redirect without popup - with order_number and verification
      router.push(`/customer/order-number?orderNumber=${result.order.order_number || result.order.id}&verificationNumber=${result.order.verification_number}`)

    } catch (error) {
      console.error('❌ Error placing order:', error)
      setIsPlacingOrder(false)
      alert(`Failed to place order: ${error instanceof Error ? error.message : 'Please try again.'}`)
    }
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-secondary mb-4 tracking-wide">
            Order Summary
          </h1>
          <p className="text-lg font-medium text-secondary/80 tracking-wide">
            Review your order and place it
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Order Items */}
          <div className="bg-white/95 rounded-2xl p-6 shadow-xl border border-secondary/30 mb-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-6 text-secondary tracking-wide">
              Your Items
            </h2>
            
            <div className="space-y-4">
              {orderItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-primary/10 rounded-xl border border-secondary/20">
                  <div>
                    <h4 className="font-bold text-secondary text-lg">{item.name}</h4>
                    <p className="text-sm text-secondary/70 font-medium">{item.variant}</p>
                    <p className="text-sm text-secondary/60">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-accent text-lg">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-secondary/30 mt-6 pt-6">
              <div className="flex justify-between items-center">
                <span className="text-xl font-black text-secondary">Total:</span>
                <span className="text-xl font-black text-accent">₹{total}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
              className="w-full py-4 rounded-xl font-bold text-xl text-white transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed bg-accent shadow-lg tracking-wide"
            >
              {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
            </button>
            
            <Link
              href="/customer/menu"
              className="block w-full py-4 text-center rounded-xl font-semibold bg-white/95 transition-all duration-300 hover:scale-105 text-secondary shadow-md border border-secondary/30 tracking-wide"
            >
              ← Back to Menu
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}