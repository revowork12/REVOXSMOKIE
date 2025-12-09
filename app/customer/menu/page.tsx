'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface MenuItem {
  id: number
  name: string
  price: number
  image: string
  variants: string[]
}

interface OrderItem {
  id: number
  name: string
  price: number
  variant: string
  image: string
  quantity: number
}

export default function MenuPage() {
  const router = useRouter()
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: string }>({})
  const [orderBasket, setOrderBasket] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showStickyHeader, setShowStickyHeader] = useState(true)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [shopStatus, setShopStatus] = useState<'open' | 'closed' | 'loading'>('loading')

  // Load menu items and shop status
  useEffect(() => {
    loadMenuItems()
    loadShopStatus()
  }, [])

  const loadShopStatus = async () => {
    if (!supabase) {
      setShopStatus('closed')
      return
    }
    
    try {
      console.log('🏪 Checking shop status...')
      const { data, error } = await supabase.rpc('get_shop_status')
      
      console.log('📊 Shop status response:', { data, error, dataType: typeof data })
      
      if (!error && data !== null && data !== undefined) {
        const status = data as string
        if (status === 'open' || status === 'closed') {
          setShopStatus(status)
          console.log('✅ Shop status set to:', status)
        } else {
          console.log('⚠️ Unknown status:', status, 'defaulting to closed')
          setShopStatus('closed')
        }
      } else {
        console.error('❌ Error loading shop status:', error)
        setShopStatus('closed') // Default to closed if error
      }
    } catch (error) {
      console.error('❌ Error checking shop status:', error)
      setShopStatus('closed') // Default to closed if error
    }
  }

  const loadMenuItems = async () => {
    try {
      const response = await fetch('/api/menu')
      const result = await response.json()
      
      if (response.ok && result.menuItems) {
        setMenuItems(result.menuItems)
      } else {
        console.error('Error loading menu:', result.error)
        // Fallback to hardcoded menu if API fails
        setMenuItems(hardcodedMenuItems)
      }
    } catch (error) {
      console.error('Error loading menu:', error)
      // Fallback to hardcoded menu if API fails
      setMenuItems(hardcodedMenuItems)
    } finally {
      setLoading(false)
    }
  }

  // Hardcoded fallback menu items
  const hardcodedMenuItems: MenuItem[] = [
    {
      id: 1,
      name: 'Montana BBQ Hamburger Regular',
      price: 280,
      image: '/photo_5890062852490464111_y1.jpg',
      variants: ['Beef', 'Chicken', 'Paneer']
    },
    {
      id: 2,
      name: 'Montana BBQ Hamburger Large',
      price: 360,
      image: '/photo_5890062852490464111_y1.jpg',
      variants: ['Beef', 'Chicken', 'Paneer']
    },
    {
      id: 3,
      name: 'Pimento Smashed Hamburger Regular',
      price: 320,
      image: '/photo_5890062852490464111_y1.jpg',
      variants: ['Beef', 'Chicken']
    },
    {
      id: 4,
      name: 'Pimento Smashed Hamburger Large',
      price: 420,
      image: '/photo_5890062852490464111_y1.jpg',
      variants: ['Beef', 'Chicken']
    },
    {
      id: 5,
      name: 'Smokies Baconator Regular',
      price: 450,
      image: '/photo_5890062852490464111_y1.jpg',
      variants: ['Beef', 'Chicken+Pork Bacon']
    },
    {
      id: 6,
      name: 'Smokies Baconator Large',
      price: 580,
      image: '/photo_5890062852490464111_y1.jpg',
      variants: ['Beef', 'Chicken+Pork Bacon']
    },
    {
      id: 7,
      name: 'Smokies Frappuccino',
      price: 150,
      image: '/photo_5890062852490464111_y1.jpg',
      variants: ['Standard']
    }
  ]

  // Scroll detection to hide/show sticky header
  useEffect(() => {
    const handleScroll = () => {
      const orderSection = document.getElementById('order-section')
      if (orderSection && orderBasket.length > 0) {
        const rect = orderSection.getBoundingClientRect()
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0
        setShowStickyHeader(!isVisible)
      }
    }

    window.addEventListener('scroll', handleScroll)
    // Check initial state
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [orderBasket.length])
  
  // Function to format item display
  const formatItemDisplay = (itemName: string, variant: string) => {
    // Extract base name and size
    const baseName = itemName.replace(/^Regular |^Large /, '')
    const sizeCode = itemName.includes('Regular') ? '(R)' : itemName.includes('Large') ? '(L)' : ''
    
    return {
      itemName: baseName,
      sizeAndVariant: `${sizeCode} (${variant})`
    }
  }

  // 7 menu items with images and variants

  // Handle adding items to cart with quantity management
  const handleAddToCart = (item: any) => {
    const selectedVariant = selectedItems[item.id]
    if (!selectedVariant) return

    // Check if item with same name and variant already exists in basket
    const existingItemIndex = orderBasket.findIndex(
      basketItem => basketItem.name === item.name && basketItem.variant === selectedVariant
    )

    if (existingItemIndex >= 0) {
      // Increase quantity if item already exists
      setOrderBasket(prev => 
        prev.map((basketItem, index) => 
          index === existingItemIndex 
            ? { ...basketItem, quantity: basketItem.quantity + 1 }
            : basketItem
        )
      )
    } else {
      // Add new item to basket
      const newOrderItem: OrderItem = {
        id: Date.now(), // Unique ID for basket UI only (not menu_item_id)
        name: item.name,
        price: item.price,
        variant: selectedVariant,
        image: item.image,
        quantity: 1
      }
      setOrderBasket(prev => [...prev, newOrderItem])
    }

    // Keep the selection so user can add multiple times
    // Don't clear the dropdown - user can change variant manually if needed
  }

  // Remove item from basket
  const removeFromBasket = (itemId: number) => {
    setOrderBasket(prev => prev.filter(item => item.id !== itemId))
    setSelectedItems(prev => {
      const updated = { ...prev }
      delete updated[itemId]
      return updated
    })
  }

  // Calculate total with quantities
  const total = orderBasket.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  // Place order
  const handlePlaceOrder = () => {
    if (orderBasket.length === 0) return
    
    // Store order data in sessionStorage
    const orderData = {
      items: orderBasket.map(item => {
        const formatted = formatItemDisplay(item.name, item.variant)
        // Find the correct menu item ID from menuItems array
        const menuItem = menuItems.find(mi => mi.name === item.name)
        return {
          id: item.id, // Keep basket UI ID for frontend
          menu_item_id: menuItem?.id || null, // Add proper menu item ID for database
          name: item.name, // Keep full original name for API parsing
          price: item.price,
          variant: item.variant, // Keep original variant for API
          quantity: item.quantity
        }
      }),
      total: total
    }
    
    sessionStorage.setItem('orderData', JSON.stringify(orderData))
    router.push('/customer/order-summary')
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Sticky Cart Header */}
      {orderBasket.length > 0 && showStickyHeader && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl border-t-4 cursor-pointer transition-all duration-300 bg-secondary/90 border-accent"
          onClick={() => {
            document.getElementById('order-section')?.scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            })
          }}
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <div className="rounded-full w-8 h-8 flex items-center justify-center text-sm font-black bg-accent text-white">
                  {orderBasket.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
                <span className="font-bold text-white text-lg">Your Order</span>
              </div>
              
              {/* Center Down Arrow */}
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center">
                <div className="rounded-full w-12 h-12 flex items-center justify-center shadow-lg bg-primary">
                  <svg 
                    className="w-6 h-6 text-secondary"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-white">₹{total}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 text-secondary drop-shadow-lg">
            SMOKIES
          </h1>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-[0.3em] mb-4 text-accent uppercase">
            MENU
          </h2>
          <p className="text-lg md:text-xl font-medium text-secondary/80 tracking-wide">
            Choose your favorite burgers
          </p>
        </div>

        {/* Shop Status Check */}
        {shopStatus === 'loading' || loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-secondary mx-auto mb-6"></div>
              <p className="text-xl font-bold text-secondary tracking-wide">
                {shopStatus === 'loading' ? 'Checking if we\'re open...' : 'Loading delicious menu...'}
              </p>
            </div>
          </div>
        ) : shopStatus === 'closed' ? (
          /* Shop Closed Message */
          <div className="text-center py-16">
            <div className="bg-white/95 rounded-2xl p-8 shadow-xl border border-secondary/30 mx-auto max-w-md backdrop-blur-sm">
              <h3 className="text-3xl font-black text-secondary mb-4">We're Closed</h3>
              <p className="text-lg text-secondary/80 mb-6 font-medium">
                Sorry, we're currently closed. Please check back later!
              </p>
              <div className="text-md text-secondary/70 font-semibold">
                <p>📅 <strong>WED - MON</strong></p>
                <p>🕐 <strong>5PM</strong> onwards</p>
              </div>
              <Link 
                href="/customer/home"
                className="inline-block mt-6 px-6 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 transition-all duration-200"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          /* Menu Grid - Only show when open */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {menuItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105"
            >
              {/* Item Image */}
              <div className="relative h-56 mb-6 rounded-2xl overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  style={{ objectPosition: '50% 35%' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>

              {/* Item Name */}
              <div className="text-left mb-6">
                {item.id !== 7 && (
                  <div className="text-sm font-black mb-2 tracking-widest px-3 py-1 rounded-full inline-block" style={{ backgroundColor: '#c4c4c4', color: '#214194' }}>
                    {item.id === 2 || item.id === 4 || item.id === 6 ? 'LARGE' : 'REGULAR'}
                  </div>
                )}
                <h3 className="text-2xl font-black leading-tight" style={{ color: '#214194' }}>
                  {item.name}
                </h3>
              </div>

              {/* Price and Dropdown */}
              <div className="flex items-center justify-between mb-6">
                {/* Price */}
                <span className="text-3xl font-black" style={{ color: '#CC2133' }}>
                  ₹{item.price}
                </span>

                {/* Dropdown */}
                {item.variants.length > 0 ? (
                  <select
                    value={selectedItems[item.id] || ''}
                    onChange={(e) => setSelectedItems(prev => ({
                      ...prev,
                      [item.id]: e.target.value
                    }))}
                    className="px-5 py-3 rounded-2xl border-3 font-bold focus:outline-none focus:ring-4 focus:ring-opacity-50 transition-all duration-300"
                    style={{
                      borderColor: '#214194',
                      color: '#214194',
                      backgroundColor: '#c4c4c4',
                      focusRingColor: '#214194'
                    }}
                  >
                    <option value="">Choose</option>
                    {item.variants.map((variant) => (
                      <option key={variant} value={variant}>
                        {variant}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedItems[item.id] || ''}
                    onChange={(e) => setSelectedItems(prev => ({
                      ...prev,
                      [item.id]: e.target.value
                    }))}
                    className="px-5 py-3 rounded-2xl border-3 font-bold focus:outline-none focus:ring-4 focus:ring-opacity-50 transition-all duration-300"
                    style={{
                      borderColor: '#214194',
                      color: '#214194',
                      backgroundColor: '#c4c4c4'
                    }}
                  >
                    <option value="">Choose</option>
                    <option value="Standard">Standard</option>
                  </select>
                )}
              </div>

              {/* Add Button */}
              <div>
                <button
                  onClick={() => handleAddToCart(item)}
                  disabled={!selectedItems[item.id]}
                  className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-xl hover:shadow-2xl"
                  style={{ 
                    backgroundColor: selectedItems[item.id] ? '#CC2133' : '#c4c4c4'
                  }}
                >
                  {selectedItems[item.id] ? 'ADD TO CART +' : 'SELECT OPTION FIRST'}
                </button>
              </div>
            </div>
            ))}
          </div>
        )}

        {/* Order Basket */}
        {orderBasket.length > 0 && (
          <div id="order-section" className="bg-white rounded-3xl p-8 shadow-2xl">
            <h2 className="text-4xl font-black mb-8 text-center" style={{ color: '#214194' }}>
              Your Order
            </h2>
            
            {/* Order Items */}
            <div className="space-y-6 mb-8">
              {orderBasket.map((item) => (
                <div key={`${item.id}-${item.variant}`} className="flex items-center justify-between p-6 rounded-2xl" style={{ backgroundColor: '#c4c4c4' }}>
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        style={{ objectPosition: '50% 35%' }}
                      />
                    </div>
                    <div>
                      {(() => {
                        const formatted = formatItemDisplay(item.name, item.variant)
                        const baseName = item.name.replace(/ Regular$| Large$/, '')
                        const sizeCode = item.name.includes('Regular') ? '(R)' : item.name.includes('Large') ? '(L)' : ''
                        
                        return (
                          <>
                            <h4 className="font-bold" style={{ color: '#214194' }}>{baseName}</h4>
                            <p className="text-sm text-gray-600">
                              {sizeCode} <span className="text-blue-600">({item.variant})</span>
                            </p>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                    <span className="font-bold text-black">₹{item.price * item.quantity}</span>
                    <button
                      onClick={() => removeFromBasket(item.id)}
                      className="text-red-500 hover:text-red-700 font-bold text-xl"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total and Place Order */}
            <div className="border-t-4 pt-8" style={{ borderTopColor: '#c4c4c4' }}>
              <div className="flex justify-between items-center mb-8">
                <span className="text-3xl font-black" style={{ color: '#214194' }}>Total:</span>
                <span className="text-4xl font-black" style={{ color: '#CC2133' }}>₹{total}</span>
              </div>
              
              <button
                onClick={handlePlaceOrder}
                className="w-full py-6 rounded-2xl font-black text-2xl text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl shadow-xl"
                style={{ backgroundColor: '#CC2133' }}
              >
                PLACE ORDER
              </button>
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link
            href="/customer/home"
            className="inline-block px-8 py-4 bg-white rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl"
            style={{ color: '#214194' }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}