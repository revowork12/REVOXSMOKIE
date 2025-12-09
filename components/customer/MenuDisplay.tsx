'use client'

import { useState } from 'react'
import { MENU_ITEMS } from '@/lib/constants'

interface MenuDisplayProps {
  onOrderComplete: (orderData: { items: Array<{ id: number, name: string, price: number, variant: string, quantity: number }>, total: number }) => void
}

export default function MenuDisplay({ onOrderComplete }: MenuDisplayProps) {
  const [orderBasket, setOrderBasket] = useState<Array<{ id: number, name: string, price: number, variant: string, quantity: number }>>([])

  const addToBasket = (item: any, variant: string) => {
    setOrderBasket(prev => {
      // Check if item with same name and variant already exists
      const existingItemIndex = prev.findIndex(
        basketItem => basketItem.name === item.name && basketItem.variant === variant
      )
      
      if (existingItemIndex >= 0) {
        // Item exists, increment quantity
        const updatedBasket = [...prev]
        updatedBasket[existingItemIndex] = {
          ...updatedBasket[existingItemIndex],
          quantity: updatedBasket[existingItemIndex].quantity + 1
        }
        return updatedBasket
      } else {
        // Item doesn't exist, add new item
        const newItem = {
          id: Date.now(), // Unique ID for each basket item
          name: item.name,
          price: item.price,
          variant: variant,
          quantity: 1
        }
        return [...prev, newItem]
      }
    })
  }

  const removeFromBasket = (basketItemId: number) => {
    setOrderBasket(prev => prev.filter(item => item.id !== basketItemId))
  }

  const getTotalAmount = () => {
    return orderBasket.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const handlePlaceOrder = () => {
    if (orderBasket.length > 0) {
      onOrderComplete({ items: orderBasket, total: getTotalAmount() })
    }
  }

  return (
    <div className="space-y-8">
      {/* Menu Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-navy-500 mb-4">🍔 SMOKIES MENU</h2>
        <p className="text-gray-600">Select your favorite items and variants</p>
      </div>

      {/* Menu Items Grid - Exactly 7 boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {MENU_ITEMS.map((item) => (
          <MenuItemBox key={item.id} item={item} onAddToBasket={addToBasket} />
        ))}
      </div>

      {/* Order Basket */}
      {orderBasket.length > 0 && (
        <div className="bg-white/90 rounded-xl p-6 shadow-lg border border-navy-500/20 sticky bottom-4">
          <h3 className="text-xl font-bold text-navy-500 mb-4">Your Order Basket</h3>
          
          <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
            {orderBasket.map((basketItem) => (
              <div key={basketItem.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{basketItem.name}</p>
                  <p className="text-sm text-gray-600">{basketItem.variant}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-green-600">₹{basketItem.price}</span>
                  <button
                    onClick={() => removeFromBasket(basketItem.id)}
                    className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-2xl font-bold text-green-600">₹{getTotalAmount()}</span>
            </div>
            
            <button
              onClick={handlePlaceOrder}
              className="w-full bg-navy-500 text-cream hover:bg-navy-600 px-6 py-3 rounded-lg font-bold text-lg transition-all duration-200 font-montserrat uppercase tracking-wide"
            >
              Place Order - ₹{getTotalAmount()}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItemBox({ item, onAddToBasket }: { item: any, onAddToBasket: (item: any, variant: string) => void }) {
  const [selectedVariant, setSelectedVariant] = useState<string>('choose')

  const handleVariantChange = (variant: string) => {
    setSelectedVariant(variant)
    if (variant !== 'choose') {
      onAddToBasket(item, variant)
      setSelectedVariant('choose') // Reset dropdown after selection
    }
  }

  return (
    <div className="bg-white/90 rounded-xl p-4 shadow-lg border border-navy-500/20 hover:shadow-xl transition-shadow">
      {/* Image */}
      <div className="w-full h-32 mb-3 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
        <img 
          src={item.image} 
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNTAgMTAwTDE3NSA3NUgxMjVMMTUwIDEwMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE1MCA5MEM0NC43NzE1IDkwIDQ0Ljc3MTUgMTEwIDQ0Ljc3MTUgMTEwSDE1MEgyNTUuMjI5QzI1NS4yMjkgMTEwIDI1NS4yMjkgOTAgMTUwIDkwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'
          }}
        />
      </div>
      
      {/* Item Name */}
      <h3 className="text-lg font-bold text-navy-500 mb-2 text-center">{item.name}</h3>
      
      {/* Price and Dropdown Row */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold text-green-600">₹{item.price}</span>
        
        <select 
          value={selectedVariant}
          onChange={(e) => handleVariantChange(e.target.value)}
          className="px-3 py-1 border border-navy-500/20 rounded-lg focus:ring-2 focus:ring-navy-500/50 focus:border-navy-500 transition-colors bg-white text-sm min-w-[80px]"
        >
          <option value="choose" disabled>Choose</option>
          {item.variants?.map((variant: string, index: number) => (
            <option key={index} value={variant}>{variant}</option>
          ))}
        </select>
      </div>
    </div>
  )
}