'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { COLORS } from '@/lib/constants'
import { TrackingSystem, type OrderStatus, type TrackingData } from '@/lib/trackingSystem'
import { SecurityManager } from '@/lib/security'
import { createClient } from '@supabase/supabase-js'
// Import demo utilities for testing (development only)
import '@/lib/trackingDemo'

// Component to display current orders
function CurrentOrdersDisplay() {
  const [currentOrders, setCurrentOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCurrentOrders = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        if (!supabase) return

        // Fetch orders that are preparing, ready, or completed (recent)
        const { data: orders, error } = await supabase
          .from('orders')
          .select(`
            order_number,
            status,
            total_amount,
            created_at
          `)
          .in('status', ['pending', 'preparing', 'ready', 'completed'])
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Error fetching current orders:', error)
          setCurrentOrders([])
        } else {
          setCurrentOrders(orders || [])
        }
      } catch (error) {
        console.error('Error in fetchCurrentOrders:', error)
        setCurrentOrders([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCurrentOrders()

    // Set up real-time subscription for all orders
    const setupRealtimeSubscription = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        if (!supabase) return

        console.log('🔔 Setting up real-time subscription for current orders...')

        const subscription = supabase
          .channel('current_orders_realtime')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orders'
            },
            (payload) => {
              console.log('🔄 Real-time order update received:', payload)
              console.log('🔄 Old status:', payload.old?.status, '→ New status:', payload.new?.status)
              
              // Immediately refresh the orders list
              fetchCurrentOrders()
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'orders'
            },
            (payload) => {
              console.log('🔄 New order created:', payload)
              fetchCurrentOrders()
            }
          )
          .subscribe((status) => {
            console.log('📡 Subscription status:', status)
            if (status === 'SUBSCRIBED') {
              console.log('✅ Successfully subscribed to real-time updates!')
            }
          })

        // Cleanup function
        return () => {
          console.log('🧹 Cleaning up current orders subscription')
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('❌ Error setting up realtime subscription:', error)
      }
    }

    const cleanup = setupRealtimeSubscription()

    // Also set up a polling fallback every 2 seconds for faster updates
    const pollingInterval = setInterval(() => {
      console.log('🔄 Polling for order updates...')
      fetchCurrentOrders()
    }, 2000)

    // Cleanup function for useEffect
    return () => {
      if (cleanup) cleanup.then(cleanupFn => cleanupFn && cleanupFn())
      clearInterval(pollingInterval)
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'preparing':
        return 'text-orange-600 bg-orange-50'
      case 'ready':
        return 'text-green-600 bg-green-50'
      case 'completed':
        return 'text-green-700 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'preparing':
        return 'Preparing'
      case 'ready':
        return 'Ready'
      case 'completed':
        return 'Completed'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
      </div>
    )
  }

  if (currentOrders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-secondary/70 font-medium">No current orders</p>
      </div>
    )
  }

  // Group orders by status
  const pendingOrders = currentOrders.filter(order => order.status === 'pending')
  const preparingOrders = currentOrders.filter(order => order.status === 'preparing')
  const readyOrders = currentOrders.filter(order => order.status === 'ready')
  const completedOrders = currentOrders.filter(order => order.status === 'completed')

  return (
    <div className="space-y-4 text-center">
      {/* Preparing Orders */}
      <div>
        <h4 className="text-sm font-semibold text-orange-600 mb-2 font-sans uppercase tracking-wider">
          Currently Preparing ({preparingOrders.length})
        </h4>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {preparingOrders.length > 0 ? (
            preparingOrders.map(order => (
              <div
                key={order.order_number}
                className="px-3 py-1 rounded-full text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-200 animate-pulse"
              >
                #{order.order_number}
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-400 font-sans">
              No orders currently preparing
            </div>
          )}
        </div>
      </div>

      {/* Ready Orders */}
      <div>
        <h4 className="text-sm font-semibold text-green-600 mb-2 font-sans uppercase tracking-wider">
          Ready for Pickup ({readyOrders.length})
        </h4>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {readyOrders.length > 0 ? (
            readyOrders.map(order => (
              <div
                key={order.order_number}
                className="px-3 py-1 rounded-full text-sm font-semibold text-green-600 bg-green-50 border border-green-200 animate-pulse"
              >
                #{order.order_number}
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-400 font-sans">
              No orders ready for pickup
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

function OrderTrackingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>('waiting')
  const [currentOrderBeingPrepared, setCurrentOrderBeingPrepared] = useState<number | null>(null)
  const [showContent, setShowContent] = useState(false)
  const [statusKey, setStatusKey] = useState(0) // For triggering animations

  useEffect(() => {
    if (typeof window === 'undefined') return

    const orderNumberParam = searchParams.get('orderNumber')
    const verificationNumberParam = searchParams.get('verificationNumber')

    console.log('Order tracking params:', { orderNumberParam, verificationNumberParam })

    if (!orderNumberParam || !verificationNumberParam) {
      console.warn('Missing order parameters')
      return
    }

    // Simple validation and parsing
    const orderNumber = parseInt(orderNumberParam)
    const verificationNumber = parseInt(verificationNumberParam)

    console.log('Parsed numbers:', { orderNumber, verificationNumber })

    if (isNaN(orderNumber) || isNaN(verificationNumber)) {
      console.warn('Invalid number format in parameters')
      return
    }

    // Connect to Supabase to get real order data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Fetch actual order from database
    const fetchOrderStatus = async () => {
      try {
        console.log('🔍 Fetching order from database:', orderNumber)
        
        const { data: orderData, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              base_name,
              protein,
              size_code,
              quantity,
              unit_price,
              total_amount
            )
          `)
          .eq('order_number', parseInt(orderNumber.toString()))
          .single()
        
        console.log('📊 Database order result:', { orderData, error })
        
        if (error) {
          console.error('❌ Error fetching order:', error)
          // Set fallback tracking data so page still shows
          const fallbackTracking = {
            orderNumber: orderNumber,
            verificationNumber: verificationNumber,
            status: 'waiting' as OrderStatus,
            timestamp: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }
          setTrackingData(fallbackTracking)
          setCurrentStatus('waiting')
          return
        }
        
        if (orderData) {
          // Get the precise order placed timestamp from sessionStorage (IST)
          const orderPlacedTimestamp = sessionStorage.getItem('orderPlacedTimestamp')
          
          const tracking = {
            orderNumber: orderData.order_number,
            verificationNumber: verificationNumber,
            status: orderData.status as OrderStatus,
            timestamp: orderPlacedTimestamp || orderData.created_at,
            lastUpdated: orderData.updated_at || orderData.created_at,
            items: orderData.order_items?.map((item: any) => ({
              name: `${item.size_code ? '(' + item.size_code + ') ' : ''}${item.base_name}`,
              variant: item.protein,
              quantity: item.quantity,
              price: item.unit_price
            })) || [],
            total: orderData.total_amount || 0
          }
          
          console.log('✅ Setting tracking data with items:', tracking)
          setTrackingData(tracking)
          setCurrentStatus(orderData.status as OrderStatus)
          
          // Check if order is already collected/completed on initial load
          if (orderData.status === 'collected' || orderData.status === 'completed') {
            console.log('🎉 Order already collected/completed! Redirecting to thank you page...')
            setTimeout(() => {
              router.push(`/customer/order-completed?orderNumber=${orderNumber}&verificationNumber=${verificationNumber}`)
            }, 3000) // 3 second delay
          }
          
          // Set up real-time subscription for status updates
          const subscription = supabase
            .channel(`order_${orderNumber}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `order_number=eq.${orderNumber}`
              },
              (payload) => {
                console.log('🔄 Real-time order update:', payload.new)
                const updatedStatus = payload.new.status as OrderStatus
                setCurrentStatus(updatedStatus)
                setStatusKey(prev => prev + 1) // Trigger animation
                
                // Update tracking data
                setTrackingData(prev => prev ? {
                  ...prev,
                  status: updatedStatus,
                  lastUpdated: payload.new.updated_at || new Date().toISOString()
                } : null)
                
                // Auto-redirect to thank you page when order is completed
                if (updatedStatus === 'completed') {
                  console.log('🎉 Order collected/completed! Redirecting to thank you page...')
                  setTimeout(() => {
                    router.push(`/customer/order-completed?orderNumber=${orderNumber}&verificationNumber=${verificationNumber}`)
                  }, 3000) // 3 second delay
                }
              }
            )
            .subscribe()
          
          console.log('🔔 Subscribed to real-time updates for order', orderNumber)
          
          // Cleanup subscription on component unmount
          return () => {
            console.log('🧹 Cleaning up subscription')
            subscription.unsubscribe()
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch order status:', error)
        // Set fallback tracking data so page still shows
        const fallbackTracking = {
          orderNumber: orderNumber,
          verificationNumber: verificationNumber,
          status: 'waiting' as OrderStatus,
          timestamp: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
        setTrackingData(fallbackTracking)
        setCurrentStatus('waiting')
      }
    }
    
    // Initial fetch and show content
    fetchOrderStatus()
    
    // Always show content after a short delay
    setTimeout(() => setShowContent(true), 500)
    
    // Return cleanup function
    return () => {
      // Cleanup will be handled by subscription
    }

    // Get tracking system instance and initial current order being prepared
    const trackingSystem = TrackingSystem.getInstance()
    const currentOrder = trackingSystem.getCurrentOrderBeingPrepared()
    setCurrentOrderBeingPrepared(currentOrder)

    // Subscribe to status updates
    const unsubscribeStatus = trackingSystem.subscribeToOrder(orderNumber, (newStatus) => {
      setCurrentStatus(newStatus)
      setStatusKey(prev => prev + 1) // Trigger animation
      
      // Redirect to completed page only when owner marks as completed
      if (newStatus === 'completed') {
        setTimeout(() => {
          window.location.href = `/customer/order-completed?orderNumber=${orderNumber}&verificationNumber=${verificationNumber}`
        }, 1000) // Brief delay to show status change
      }
    })

    // Subscribe to current order being prepared updates
    const unsubscribeCurrentOrder = trackingSystem.subscribeToCurrentOrder((currentOrderNumber) => {
      setCurrentOrderBeingPrepared(currentOrderNumber)
    })

    // Trigger fade-in animation
    const timer = setTimeout(() => {
      setShowContent(true)
    }, 300)

    return () => {
      // Enhanced cleanup to prevent memory leaks
      try {
        unsubscribeStatus()
        unsubscribeCurrentOrder()
      } catch (error) {
        console.warn('Error during subscription cleanup:', error)
      }
      clearTimeout(timer)
    }
  }, [searchParams])

  const getStatusMessage = (status: OrderStatus): string => {
    switch (status) {
      case 'waiting':
        return 'waiting...'
      case 'preparing':
        return `preparing order #${trackingData?.orderNumber || ''}`
      case 'ready':
        return 'ready — please collect your order'
      case 'completed':
        return 'order completed — redirecting...'
      default:
        return 'waiting...'
    }
  }

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case 'waiting':
        return 'text-secondary/70'
      case 'preparing':
        return 'text-orange-600'
      case 'ready':
        return 'text-green-600'
      case 'completed':
        return 'text-green-700'
      default:
        return 'text-secondary/70'
    }
  }

  if (!trackingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-secondary mx-auto mb-6" aria-label="Loading"></div>
          <p className="text-secondary font-semibold text-lg tracking-wide">Loading order tracking...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="relative inline-block">
              {/* Minimalist dots decoration */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-secondary/30"></div>
                <div className="w-2 h-2 rounded-full bg-secondary/50"></div>
                <div className="w-2 h-2 rounded-full bg-secondary/70"></div>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-[0.25em] uppercase transition-all duration-300 hover:tracking-[0.3em] text-secondary drop-shadow-lg">
                ORDER TRACKING
              </h1>
              
              {/* Subtitle */}
              <p className="text-lg font-medium text-secondary/80 tracking-wide">
                Track your delicious order
              </p>
              
              {/* Subtle underline */}
              <div className="w-24 h-1 bg-secondary/50 mx-auto mt-4 rounded-full"></div>
            </div>
          </div>

          {/* Order Information Card with Fade-in Animation */}
          <div 
            className={`bg-white/95 rounded-2xl p-8 shadow-xl border border-secondary/30 mb-12 transition-all duration-1000 backdrop-blur-sm ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {/* Screenshot Reminder */}
            <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg text-center">
              <p className="text-lg font-semibold text-yellow-800">
                📸 Screenshot Your e-Bill 📸
              </p>
            </div>

            {/* Order Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Order Number */}
              <div className="bg-secondary/10 rounded-xl p-6 border-2 border-secondary/30 text-center">
                <div className="text-sm font-bold text-secondary/70 uppercase tracking-wider mb-2">
                  Order Number
                </div>
                <div className="text-3xl font-black text-accent" aria-label={`Order number ${trackingData.orderNumber}`}>
                  #{trackingData.orderNumber}
                </div>
              </div>

              {/* Verification Number */}
              <div className="bg-secondary/10 rounded-xl p-6 border-2 border-secondary/30 text-center">
                <div className="text-sm font-bold text-secondary/70 uppercase tracking-wider mb-2">
                  Verification Number
                </div>
                <div className="text-3xl font-black text-accent" aria-label={`Verification number ${trackingData.verificationNumber}`}>
                  {trackingData.verificationNumber}
                </div>
              </div>
            </div>

            {/* Current Orders Section */}
            <div className="mt-8 mb-8">
              <h3 className="text-lg font-bold text-secondary mb-4 text-center underline tracking-wide">
                Current Orders
              </h3>
              <CurrentOrdersDisplay />
            </div>

            {/* Bill Section */}
            <div className="mt-8 mb-8">
              <div className="bg-white/95 rounded-xl p-6 shadow-xl border border-secondary/30 backdrop-blur-sm">
                {/* Business Name Header */}
                <h2 className="text-2xl font-black text-center mb-6 text-secondary tracking-wide">
                  SMOKIES HAMBURGER
                </h2>
                
                {/* Order Details (Left Side) */}
                <div className="flex justify-between items-start mb-6">
                  <div className="text-left">
                    <p className="text-sm font-bold text-secondary">
                      Order Number: <span className="font-black text-accent">#{trackingData.orderNumber}</span>
                    </p>
                    <p className="text-sm font-bold text-secondary">
                      Verification: <span className="font-black text-accent">{trackingData.verificationNumber}</span>
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div className="font-semibold">
                      {(() => {
                        // Check if timestamp is the precise IST string or database timestamp
                        const orderPlacedTimestamp = sessionStorage.getItem('orderPlacedTimestamp')
                        if (orderPlacedTimestamp && trackingData.timestamp === orderPlacedTimestamp) {
                          // Parse the precise IST timestamp: "09/12/2024, 15:30:45"
                          const [datePart] = orderPlacedTimestamp.split(', ')
                          return datePart
                        } else {
                          // Fallback to database timestamp
                          return new Date(trackingData.timestamp).toLocaleDateString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        }
                      })()}
                    </div>
                    <div className="text-xs">
                      {(() => {
                        // Check if timestamp is the precise IST string or database timestamp  
                        const orderPlacedTimestamp = sessionStorage.getItem('orderPlacedTimestamp')
                        if (orderPlacedTimestamp && trackingData.timestamp === orderPlacedTimestamp) {
                          // Parse the precise IST timestamp: "09/12/2024, 15:30:45"
                          const [, timePart] = orderPlacedTimestamp.split(', ')
                          // Convert 24-hour to 12-hour format
                          const [hours, minutes, seconds] = timePart.split(':')
                          const hour12 = parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours)
                          const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM'
                          return `${hour12}:${minutes}:${seconds} ${ampm}`
                        } else {
                          // Fallback to database timestamp
                          return new Date(trackingData.timestamp).toLocaleTimeString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                        }
                      })()}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-300 mb-4"></div>

                {/* Order Items */}
                <div className="space-y-3 mb-4">
                  {trackingData.items && trackingData.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-600 lowercase">{item.variant}</p>
                      </div>
                      <div className="text-center px-4">
                        <p className="text-sm font-semibold">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-center px-4">
                        <p className="text-sm">₹{item.price}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{item.price * item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-300 mb-4"></div>

                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="text-xl font-black text-secondary">TOTAL:</span>
                  <span className="text-2xl font-black text-accent">₹{trackingData.total}</span>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-sm text-gray-500">
                  <p>Thank you for choosing Smokies Hamburger!</p>
                  <p>WED - MON, 5pm Onwards</p>
                </div>
              </div>
            </div>

            {/* Status Section with Smooth Transitions */}
            <div className="text-center">
              {/* Current Status */}
              <div>
                <div className="text-lg font-bold text-secondary mb-4 text-center underline tracking-wide">
                  Current Status
                </div>
                <div 
                  key={statusKey}
                  className={`text-2xl md:text-3xl font-bold font-sans transition-all duration-500 ${getStatusColor(currentStatus)} animate-fade-in`}
                  aria-label={`Order status: ${getStatusMessage(currentStatus)}`}
                >
                  {getStatusMessage(currentStatus)}
                </div>
              </div>
            </div>

            {/* Status Indicator Dots */}
            <div className="flex justify-center items-center mt-8 space-x-4">
              <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
                ['waiting', 'preparing', 'ready', 'completed'].includes(currentStatus) ? 'bg-secondary' : 'bg-secondary/30'
              } ${currentStatus === 'waiting' ? 'animate-breathing' : ''}`} aria-label="Waiting status - Order received"></div>
              <div className={`w-8 h-1 transition-all duration-300 ${
                ['preparing', 'ready', 'completed'].includes(currentStatus) ? 'bg-orange-500' : 'bg-navy-200'
              }`}></div>
              <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
                currentStatus === 'preparing' ? 'bg-orange-500 scale-125 animate-pulse' : 
                ['ready', 'completed'].includes(currentStatus) ? 'bg-orange-500' : 'bg-navy-200'
              }`} aria-label="Preparing status - Order being prepared"></div>
              <div className={`w-8 h-1 transition-all duration-300 ${
                ['ready', 'completed'].includes(currentStatus) ? 'bg-green-500' : 'bg-navy-200'
              }`}></div>
              <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
                currentStatus === 'ready' ? 'bg-green-500 scale-125 animate-pulse' : 
                currentStatus === 'completed' ? 'bg-green-500' : 'bg-navy-200'
              }`} aria-label="Ready status - Order ready for pickup"></div>
              <div className={`w-8 h-1 transition-all duration-300 ${
                currentStatus === 'completed' ? 'bg-green-700' : 'bg-navy-200'
              }`}></div>
              <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
                currentStatus === 'completed' ? 'bg-green-700 scale-125 animate-pulse' : 'bg-navy-200'
              }`} aria-label="Completed status - Order completed"></div>
            </div>
          </div>

          {/* Back to Order Number Link */}
          <div className="text-center">
            <Link
              href={`/customer/order-number?orderNumber=${trackingData.orderNumber}&verificationNumber=${trackingData.verificationNumber}`}
              className="inline-block text-navy-500 font-semibold hover:underline transition-all duration-200 font-sans focus:outline-none focus:ring-2 focus:ring-navy-500/50 rounded px-2 py-1"
              aria-label="Go back to order confirmation"
            >
              ← Back to Order Confirmation
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderTracking() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-secondary mx-auto mb-6" aria-label="Loading"></div>
          <p className="text-secondary font-semibold text-lg tracking-wide">Loading order tracking...</p>
        </div>
      </div>
    }>
      <div className="order-tracking-page">
        <OrderTrackingContent />
      </div>
    </Suspense>
  )
}

// Add custom CSS for fade-in animation and breathing effect
const styles = `
  .animate-fade-in {
    animation: fadeIn 0.5s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-breathing {
    animation: breathing 2s ease-in-out infinite;
  }

  @keyframes breathing {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(0.7);
    }
  }
`

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}