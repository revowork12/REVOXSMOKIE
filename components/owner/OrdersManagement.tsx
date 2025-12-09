'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Order {
  id: string
  order_number: number
  verification_number: number
  status: 'pending' | 'preparing' | 'ready' | 'collected'
  created_at: string
  items?: any
  total_amount?: number
}

interface OrderItem {
  id: number
  base_name: string
  size_code: string
  protein: string
  quantity: number
  unit_price: number
  total_amount: number
}

export default function OrdersManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [orderItems, setOrderItems] = useState<{ [key: string]: OrderItem[] }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set())
  const [selectedStatuses, setSelectedStatuses] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    loadOrders()
    
    // Only use real-time subscription (no auto-refresh interval)
    const subscription = supabase
      ?.channel('orders-management')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        loadOrders()
      })
      .subscribe()

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const loadOrders = async () => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    try {
      // Load active orders only (exclude completed orders)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .neq('status', 'completed')
        .order('created_at', { ascending: false })

      if (ordersError) {
        console.error('Error loading orders:', ordersError)
        return
      }

      setOrders(ordersData || [])
      
      // Initialize selected statuses to match current order statuses
      setSelectedStatuses(prev => {
        const newStatusMap: { [key: string]: string } = {}
        ordersData?.forEach(order => {
          newStatusMap[order.order_number] = order.status
        })
        return newStatusMap
      })

      // Load order items for each order
      if (ordersData && ordersData.length > 0) {
        const orderNumbers = ordersData.map(order => order.order_number)
        
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderNumbers)

        if (!itemsError && itemsData) {
          // Group items by order_id
          const itemsGrouped = itemsData.reduce((acc, item) => {
            const orderId = item.order_id.toString()
            if (!acc[orderId]) acc[orderId] = []
            acc[orderId].push(item)
            return acc
          }, {} as { [key: string]: OrderItem[] })

          setOrderItems(itemsGrouped)
        }
      }
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const updateOrderStatus = async (orderNumber: number, newStatus: string) => {
    if (!supabase) return

    setUpdatingOrders(prev => {
      const newSet = new Set(prev)
      newSet.add(orderNumber.toString())
      return newSet
    })

    try {
      // If status is 'collected', directly update to 'completed'
      const finalStatus = newStatus === 'collected' ? 'completed' : newStatus
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: finalStatus,
          updated_at: new Date().toISOString()
        })
        .eq('order_number', orderNumber)

      if (error) {
        console.error('Error updating order status:', error)
        alert('Failed to update order status')
      } else {
        
        // If original status was 'collected', remove from UI immediately
        if (newStatus === 'collected') {
          // Remove from UI immediately
          setOrders(prevOrders => prevOrders.filter(o => o.order_number !== orderNumber))
          setSelectedStatuses(prevStatuses => {
            const newStatuses = { ...prevStatuses }
            delete newStatuses[orderNumber.toString()]
            return newStatuses
          })
          console.log(`✅ Order ${orderNumber} marked as completed and removed`)
        } else {
          // For other statuses, reload orders
          loadOrders()
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Failed to update order status')
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderNumber.toString())
        return newSet
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'collected':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const calculateTotal = (orderNumber: number): number => {
    const items = orderItems[orderNumber.toString()] || []
    return items.reduce((total, item) => {
      return total + item.total_amount
    }, 0)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No active orders</h3>
        <p className="text-gray-500">New orders will appear here automatically</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Active Orders ({orders.length})</h2>
          <p className="text-gray-600">Manage incoming orders and update status</p>
        </div>
      </div>
      
      <div className="grid gap-4">
        {orders.map((order) => {
          const items = orderItems[order.order_number.toString()] || []
          const total = calculateTotal(order.order_number)
          const isUpdating = updatingOrders.has(order.order_number.toString())
          const currentSelectedStatus = selectedStatuses[order.order_number] || order.status
          const hasChanged = currentSelectedStatus !== order.status
          
          return (
            <div key={order.order_number} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 space-y-2 sm:space-y-0">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Order #{order.order_number}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      Verification: <span className="font-mono font-semibold text-lg text-blue-600">{order.verification_number}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(currentSelectedStatus)} whitespace-nowrap`}>
                    {currentSelectedStatus.toUpperCase()}
                  </span>
                </div>

              {/* Order Items */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Items:</h4>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="space-y-1">
                    {items.map((item, index) => {
                      // Format: 2x-(R)-(Beef)-Smokies Baconator
                      return (
                        <div key={index} className="text-sm font-medium text-gray-800">
                          {item.quantity}x-({item.size_code})-<span className="text-blue-600">({item.protein})</span>-{item.base_name}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t">
                  <span className="font-medium text-gray-700">Total:</span>
                  <span className="font-bold text-lg text-green-600">₹{total.toFixed(0)}</span>
                </div>
              </div>

                {/* Status Update Controls */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Update Order Status:</label>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <select
                      value={currentSelectedStatus}
                      onChange={(e) => setSelectedStatuses(prev => ({
                        ...prev,
                        [order.order_number]: e.target.value
                      }))}
                      disabled={isUpdating}
                      className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 bg-white ${
                        hasChanged ? 'border-orange-300 bg-orange-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Ready</option>
                      <option value="collected">Collected</option>
                    </select>
                    
                    <button
                      onClick={() => updateOrderStatus(order.order_number, currentSelectedStatus)}
                      disabled={isUpdating || !hasChanged}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm whitespace-nowrap ${
                        hasChanged && !isUpdating
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isUpdating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                          Updating...
                        </>
                      ) : hasChanged ? (
                        `Update to ${currentSelectedStatus}`
                      ) : (
                        'No Change'
                      )}
                    </button>
                  </div>
                  {hasChanged && (
                    <p className="text-xs text-orange-600 mt-1">
                      Status will change from "{order.status}" to "{currentSelectedStatus}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}