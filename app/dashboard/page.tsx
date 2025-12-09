'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import OrdersManagement from '@/components/owner/OrdersManagement'
import MenuManagement from '@/components/owner/MenuManagement'
import { useAuth } from '@/lib/auth-context'
import LogoutButton from '@/components/auth/LogoutButton'

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState('orders')
  const [shopStatus, setShopStatus] = useState<'open' | 'closed' | 'not_started'>('not_started')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const { user, loading } = useAuth()

  useEffect(() => {
    // Auth check is handled by middleware, but we can add extra verification here
    if (!loading && !user) {
      // This shouldn't happen due to middleware, but just in case
      window.location.href = '/login'
      return
    }

    // Load initial shop status
    if (user) {
      loadShopStatus()
    }
  }, [user, loading])

  const loadShopStatus = async () => {
    if (!supabase) return
    
    try {
      // Use the SQL function to get shop status
      const { data, error } = await supabase.rpc('get_shop_status')

      if (data && !error) {
        setShopStatus(data as 'open' | 'closed' | 'not_started')
        console.log('✅ Shop status loaded:', data)
      } else {
        console.error('❌ Error loading shop status:', error)
        setShopStatus('closed') // Default to closed
      }
    } catch (error) {
      console.error('❌ Error loading shop status:', error)
      setShopStatus('closed') // Default to closed
    }
  }

  const updateShopStatus = async (newStatus: 'open' | 'closed') => {
    if (!supabase) {
      alert('❌ Database connection not available')
      return
    }
    
    // Simple confirmation without order reset mention
    const message = newStatus === 'open' 
      ? 'Open the shop for customers?'
      : 'Close the shop?'
    
    if (!confirm(message)) return
    
    setIsUpdatingStatus(true)
    
    try {
      console.log('🔄 Updating shop status to:', newStatus)
      
      // Use the SQL function to update shop status
      const { data, error } = await supabase.rpc('update_shop_status', {
        new_status: newStatus
      })
      
      console.log('📊 Update result:', { data, error })
      
      if (!error && data === true) {
        setShopStatus(newStatus)
        console.log('✅ Shop status updated successfully to:', newStatus)
        
        if (newStatus === 'closed') {
          alert('✅ Shop closed successfully!')
        } else {
          alert('✅ Shop opened successfully! Ready to serve customers.')
        }
      } else {
        console.error('❌ Database error:', error)
        alert(`❌ Failed to update shop status: ${error?.message || 'Update function returned false'}`)
      }
    } catch (error) {
      console.error('❌ Exception occurred:', error)
      alert('❌ Failed to update shop status. Check console for details.')
    }
    
    setIsUpdatingStatus(false)
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fcf9da' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show message if not authenticated (shouldn't happen due to middleware)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fcf9da' }}>
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="bg-white/95 shadow-lg border-b-2 border-secondary/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-black text-secondary mb-2 tracking-wide">🍔 SMOKIES DASHBOARD</h1>
              <p className="text-secondary/70 font-medium tracking-wide">Manage your café operations</p>
            </div>
            
            {/* Shop Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
              <div className="flex space-x-3">
                <button
                  onClick={() => updateShopStatus('open')}
                  disabled={isUpdatingStatus || shopStatus === 'open'}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center tracking-wide"
                >
                  {isUpdatingStatus && shopStatus !== 'open' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Opening...
                    </>
                  ) : (
                    '🟢 Shop Open'
                  )}
                </button>
                <button
                  onClick={() => updateShopStatus('closed')}
                  disabled={isUpdatingStatus || shopStatus === 'closed'}
                  className="bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center tracking-wide"
                >
                  {isUpdatingStatus && shopStatus !== 'closed' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Closing...
                    </>
                  ) : (
                    '🔴 Close Shop'
                  )}
                </button>
              </div>
              
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>


      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white/95 rounded-2xl shadow-xl border border-secondary/30 mb-8 backdrop-blur-sm">
          <nav className="flex space-x-0">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 py-4 px-6 text-center font-bold text-sm rounded-l-2xl transition-all duration-200 tracking-wide ${
                activeTab === 'orders'
                  ? 'bg-secondary/10 text-secondary border-r border-secondary/30'
                  : 'text-secondary/70 hover:text-secondary hover:bg-secondary/5 border-r border-secondary/20'
              }`}
            >
              📋 Orders Management
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex-1 py-4 px-6 text-center font-bold text-sm rounded-r-2xl transition-all duration-200 tracking-wide ${
                activeTab === 'menu'
                  ? 'bg-secondary/10 text-secondary'
                  : 'text-secondary/70 hover:text-secondary hover:bg-secondary/5'
              }`}
            >
              🍽️ Menu Management
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'orders' && <OrdersManagement />}
        {activeTab === 'menu' && <MenuManagement />}
      </div>
    </div>
  )
}