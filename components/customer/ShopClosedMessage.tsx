'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface ShopClosedMessageProps {
  onShopStatusChange: (isOpen: boolean) => void
}

export default function ShopClosedMessage({ onShopStatusChange }: ShopClosedMessageProps) {
  const [shopStatus, setShopStatus] = useState<string>('closed')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadShopStatus()
    
    // Set up real-time subscription for shop status changes
    const subscription = supabase
      ?.channel('shop-status-customer')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shop_status'
      }, (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'status' in payload.new) {
          const newStatus = payload.new.status as string
          setShopStatus(newStatus)
          onShopStatusChange(newStatus === 'open')
        }
      })
      .subscribe()

    return () => {
      subscription?.unsubscribe()
    }
  }, [onShopStatusChange])

  const loadShopStatus = async () => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('shop_status')
        .select('status')
        .eq('id', 1)
        .single()

      if (data && !error) {
        const status = data.status as string
        setShopStatus(status)
        onShopStatusChange(status === 'open')
        console.log('Shop status loaded:', status) // Debug log
      } else {
        console.error('Error loading shop status:', error)
        // Default to closed if error
        setShopStatus('closed')
        onShopStatusChange(false)
      }
    } catch (error) {
      console.error('Error loading shop status:', error)
      // Default to closed if error
      setShopStatus('closed')
      onShopStatusChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-pulse text-gray-500">Checking shop status...</div>
      </div>
    )
  }

  if (shopStatus === 'open') {
    return null // Don't show anything if shop is open
  }

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 mx-4 rounded-r-lg">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-red-800">
            Store is currently closed, orders cannot be placed
          </p>
          <p className="text-xs text-red-600 mt-1">
            Please check back later when we're open for business
          </p>
        </div>
      </div>
    </div>
  )
}