'use client'
import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import { COLORS, type Quantities } from '@/lib/constants'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic'

interface MenuItem {
  id: number
  name: string
  price: number
  stock_quantity: number
  emoji?: string
}

export default function CustomerMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [shopStatus, setShopStatus] = useState<'open' | 'closed' | 'loading'>('loading')
  
  // Initialize Supabase with runtime check
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !key) {
      console.warn('Supabase environment variables not configured')
      return null
    }
    
    return createClient(url, key)
  }, [])
  
  // State to track quantities for each menu item
  const [quantities, setQuantities] = useState<Quantities>({})

  // Load menu items and shop status from database
  useEffect(() => {
    // TEMPORARY DEV OVERRIDE - Force shop to be open for testing
    setShopStatus('open')
    setIsLoading(false)
    
    loadMenuItems()
    loadShopStatus()
    const cleanupMenu = setupRealTimeSubscription()
    const cleanupShop = setupShopStatusSubscription()
    return () => {
      cleanupMenu()
      cleanupShop()
    }
  }, [])

  const loadMenuItems = async () => {
    try {
      console.log('🍽️ Loading menu items from database...')
      console.log('Supabase client exists:', !!supabase)
      
      if (!supabase) {
        console.warn('⚠️ Supabase not configured, using fallback menu')
        setIsLoading(false)
        return
      }
      
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('id')

      console.log('Raw database response:', { data, error })

      if (error) {
        console.error('❌ Error loading menu items:', error)
        setIsLoading(false)
        return
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No menu items found in database! Using fallback.')
        // If no items in database, show message to owner
        setMenuItems([])
        setIsLoading(false)
        return
      }

      console.log('✅ Menu items loaded:', data)
      
      // Add default emojis for items that don't have them
      const itemsWithEmojis = data.map((item) => ({
        ...item,
        emoji: getEmojiForItem(item.name)
      }))
      
      setMenuItems(itemsWithEmojis)
      
      // Initialize quantities for all items
      const initialQuantities: Quantities = {}
      itemsWithEmojis.forEach(item => {
        initialQuantities[item.id] = 0
      })
      setQuantities(initialQuantities)
      
    } catch (error) {
      console.error('❌ Exception loading menu items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getEmojiForItem = (name: string): string => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('tea')) return '🍵'
    if (lowerName.includes('coffee') || lowerName.includes('kappi')) return '☕'
    if (lowerName.includes('bun') || lowerName.includes('bread')) return '🍞'
    if (lowerName.includes('egg')) return '🥚'
    if (lowerName.includes('toast')) return '🍞'
    if (lowerName.includes('burrito')) return '🌯'
    if (lowerName.includes('avocado')) return '🥑'
    if (lowerName.includes('pancake')) return '🥞'
    if (lowerName.includes('tiramisu') || lowerName.includes('cake')) return '🍰'
    if (lowerName.includes('pistachio')) return '🥜'
    return '🍽️'
  }

  const loadShopStatus = async () => {
    try {
      console.log('🏪 Loading shop status...')
      
      if (!supabase) {
        console.warn('⚠️ Supabase not configured, defaulting to closed')
        setShopStatus('closed')
        return
      }
      
      const { data, error } = await supabase
        .from('shop_status')
        .select('status')
        .eq('id', 1)
        .single()

      if (error) {
        console.error('❌ Error loading shop status:', error)
        setShopStatus('closed')
      } else {
        const status = data.status === 'open' ? 'open' : 'closed'
        console.log('✅ Shop status:', status)
        setShopStatus(status)
      }
    } catch (error) {
      console.error('❌ Exception loading shop status:', error)
      setShopStatus('closed')
    }
  }

  const setupShopStatusSubscription = () => {
    console.log('🔔 Setting up shop status subscription...')
    
    if (!supabase) {
      console.warn('⚠️ Supabase not configured, skipping shop status subscription')
      return () => {}
    }
    
    const subscription = supabase
      .channel('shop_status_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shop_status',
          filter: 'id=eq.1'
        },
        (payload) => {
          console.log('🔄 Real-time shop status update:', payload.new)
          const newStatus = payload.new.status === 'open' ? 'open' : 'closed'
          setShopStatus(newStatus)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const setupRealTimeSubscription = () => {
    console.log('🔔 Setting up real-time menu subscription...')
    
    if (!supabase) {
      console.warn('⚠️ Supabase not configured, skipping real-time subscription')
      return () => {}
    }
    
    const subscription = supabase
      .channel('menu_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items'
        },
        (payload) => {
          console.log('🔄 Real-time menu update:', payload)
          
          if (payload.eventType === 'UPDATE') {
            setMenuItems(prev => prev.map(item => 
              item.id === payload.new.id 
                ? { ...payload.new, emoji: getEmojiForItem(payload.new.name) } as MenuItem
                : item
            ))
          } else if (payload.eventType === 'INSERT') {
            const newItem = { ...payload.new, emoji: getEmojiForItem(payload.new.name) } as MenuItem
            setMenuItems(prev => [...prev, newItem])
            setQuantities(prev => ({ ...prev, [newItem.id]: 0 }))
          } else if (payload.eventType === 'DELETE') {
            setMenuItems(prev => prev.filter(item => item.id !== payload.old.id))
            setQuantities(prev => {
              const { [payload.old.id]: removed, ...rest } = prev
              return rest
            })
          }
        }
      )
      .subscribe()

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }

  // Memoized selected items for performance
  const selectedItems = useMemo(() => {
    return menuItems.filter(item => quantities[item.id] > 0)
  }, [menuItems, quantities])

  // Memoized total calculation
  const totalPrice = useMemo(() => {
    return menuItems.reduce((total, item) => total + (item.price * quantities[item.id]), 0)
  }, [menuItems, quantities])

  // Function to increase quantity with stock check
  const increaseQuantity = (itemId: number) => {
    const item = menuItems.find(item => item.id === itemId)
    const currentQty = quantities[itemId] || 0
    
    if (item && currentQty < item.stock_quantity) {
      setQuantities(prev => ({
        ...prev,
        [itemId]: currentQty + 1
      }))
    } else {
      alert(`Sorry, only ${item?.stock_quantity} items available in stock!`)
    }
  }

  // Function to decrease quantity (only if quantity >= 1)
  const decreaseQuantity = (itemId: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, prev[itemId] - 1)
    }))
  }

  // Keyboard event handler for quantity controls
  const handleKeyPress = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      action()
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="font-bold text-navy-500 mb-4 font-montserrat uppercase tracking-wider" style={{ fontSize: '3rem' }}>
            MENU
          </h1>
          <p className="text-lg md:text-xl text-navy-500 font-medium mb-8">
            Pick your favorites! 🍽️
          </p>
          
          {/* Back to Home Button */}
          <Link
            href="/customer/home"
            className="inline-block bg-navy-500 text-cream px-6 py-3 rounded-lg font-semibold hover:scale-105 hover:shadow-lg transition-all duration-200 font-montserrat"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Loading State */}
        {isLoading || shopStatus === 'loading' ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-500 mx-auto mb-4"></div>
              <p className="text-navy-500">Loading delicious menu...</p>
            </div>
          </div>
        ) : false ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md mx-auto">
              <div className="bg-white/90 rounded-3xl shadow-lg p-8 border-2 border-red-200">
                <div className="text-6xl mb-4">🔒</div>
                <h1 className="text-3xl font-bold text-red-600 mb-4 font-montserrat">
                  Shop Closed
                </h1>
                <p className="text-lg text-navy-500 mb-6">
                  We're currently closed. Please check back later when we reopen!
                </p>
                <div className="text-sm text-gray-500">
                  Thank you for your patience ❤️
                </div>
              </div>
            </div>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md mx-auto">
              <div className="text-6xl mb-4">🍽️</div>
              <h2 className="text-2xl font-bold text-navy-500 mb-4">No Menu Items Yet</h2>
              <p className="text-navy-500/70 mb-4">
                The menu is being prepared! Please ask the owner to add menu items.
              </p>
              <div className="text-sm text-navy-500/50">
                Owner can add items at: /dashboard → Menu Management
              </div>
            </div>
          </div>
        ) : (
        /* Menu Items Grid */
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-6 md:gap-8">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="bg-white/70 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border border-navy-500/10"
              >
                <div className="flex items-center justify-between">
                  {/* Item Info */}
                  <div className="flex items-center gap-4">
                    <span className="text-4xl" role="img" aria-label={item.name}>{item.emoji}</span>
                    <div>
                      <h3 className="text-xl font-bold text-navy-500 font-montserrat">
                        {item.name}
                      </h3>
                      <p className="text-lg font-semibold text-navy-500/80">
                        ₹{item.price}
                      </p>
                      {/* Stock Warning */}
                      {item.stock_quantity <= 5 && item.stock_quantity > 0 && (
                        <p className="text-sm text-orange-600 font-medium flex items-center gap-1">
                          ⚠️ Only {item.stock_quantity} left!
                        </p>
                      )}
                      {item.stock_quantity === 0 && (
                        <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                          ❌ Out of stock
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-4">
                    {/* Decrease Button */}
                    <button
                      onClick={() => decreaseQuantity(item.id)}
                      onKeyDown={(e) => handleKeyPress(e, () => decreaseQuantity(item.id))}
                      disabled={quantities[item.id] === 0}
                      aria-label={`Decrease ${item.name} quantity`}
                      className={`w-12 h-12 rounded-full font-bold text-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 ${
                        quantities[item.id] === 0
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-red-500 text-white hover:bg-red-600 hover:scale-110 active:scale-95 shadow-md hover:shadow-lg'
                      }`}
                    >
                      −
                    </button>

                    {/* Quantity Display */}
                    <div className="w-16 text-center">
                      <span className="text-2xl font-bold text-navy-500" aria-label={`Quantity: ${quantities[item.id]}`}>
                        {quantities[item.id]}
                      </span>
                    </div>

                    {/* Increase Button */}
                    <button
                      onClick={() => increaseQuantity(item.id)}
                      onKeyDown={(e) => handleKeyPress(e, () => increaseQuantity(item.id))}
                      disabled={item.stock_quantity === 0 || quantities[item.id] >= item.stock_quantity}
                      aria-label={`Increase ${item.name} quantity`}
                      className={`w-12 h-12 rounded-full font-bold text-xl transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 ${
                        item.stock_quantity === 0 || quantities[item.id] >= item.stock_quantity
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-500 text-white hover:bg-green-600 hover:scale-110 active:scale-95 focus:ring-green-400'
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary Section - Only show when items are selected */}
          {selectedItems.length > 0 && (
            <div className="mt-12 bg-white/90 rounded-xl p-6 shadow-lg border border-navy-500/20 animate-fade-in">
              
              {/* Display selected items */}
              <div className="space-y-2 mb-6">
                <h3 className="text-lg font-bold text-navy-500 mb-4 flex items-center gap-2">
                  🛒 Your Order
                </h3>
                {selectedItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-navy-500/10">
                    <span className="font-medium text-navy-500">
                      <span role="img" aria-label={item.name}>{item.emoji}</span> {item.name} x {quantities[item.id]}
                    </span>
                    <span className="font-semibold text-navy-500">
                      ₹{item.price * quantities[item.id]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-navy-500/20 pt-4">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xl font-bold text-navy-500">Total:</span>
                  <span className="text-2xl font-bold text-navy-500">
                    ₹{totalPrice}
                  </span>
                </div>
                
                {/* Continue Button */}
                <div className="text-center">
                  <Link
                    href={`/customer/order-summary?${selectedItems
                      .map(item => `qty_${item.id}=${quantities[item.id]}`)
                      .join('&')}`}
                    className="inline-block bg-navy-500 text-cream hover:bg-navy-600 px-8 py-4 rounded-xl font-bold text-xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl font-montserrat uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-navy-500/50"
                    role="button"
                    aria-label="Continue to order summary"
                  >
                    Continue →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  )
}