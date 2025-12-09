'use client'

import { useState, useEffect } from 'react'

interface MenuItem {
  id: number
  name: string
  price: number
  image: string
  variants: string[]
}

export default function MenuManagement() {
  // Load menu items from database
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [editingItem, setEditingItem] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingPrice, setEditingPrice] = useState(0)
  const [newVariant, setNewVariant] = useState('')

  // Load menu items from database
  useEffect(() => {
    loadMenuItems()
  }, [])

  const loadMenuItems = async () => {
    try {
      const response = await fetch('/api/menu')
      const result = await response.json()
      
      if (response.ok && result.menuItems) {
        setMenuItems(result.menuItems)
      } else {
        console.error('Error loading menu:', result.error)
      }
    } catch (error) {
      console.error('Error loading menu:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Start editing an item
  const startEditing = (item: MenuItem) => {
    setEditingItem(item.id)
    setEditingName(item.name)
    setEditingPrice(item.price)
  }

  // Save item changes
  const saveChanges = async () => {
    if (!editingItem) return

    try {
      const response = await fetch('/api/menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem,
          name: editingName,
          price: editingPrice
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        // Update local state
        setMenuItems(prev => prev.map(item => 
          item.id === editingItem 
            ? { ...item, name: editingName, price: editingPrice }
            : item
        ))
        setEditingItem(null)
        setEditingName('')
        setEditingPrice(0)
        alert('✅ Menu item updated successfully!')
      } else {
        console.error('Error updating item:', result.error)
        alert('❌ Failed to update menu item')
      }
    } catch (error) {
      console.error('Error updating item:', error)
      alert('❌ Failed to update menu item')
    }
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingItem(null)
    setEditingName('')
    setEditingPrice(0)
  }

  // Add variant to global list
  const addVariant = async (itemId: number) => {
    if (newVariant.trim() === '') return
    
    try {
      const response = await fetch('/api/menu/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_name: newVariant.trim()
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        // Reload menu to get updated variants from database
        loadMenuItems()
        setNewVariant('')
        alert('✅ Variant added to global list! All menu items now have this variant available.')
      } else {
        console.error('Error adding variant:', result.error)
        alert('❌ Failed to add variant')
      }
    } catch (error) {
      console.error('Error adding variant:', error)
      alert('❌ Failed to add variant')
    }
  }

  // Remove variant from global list
  const removeVariant = async (itemId: number, variantToRemove: string) => {
    if (!confirm(`Are you sure you want to remove "${variantToRemove}" variant from ALL menu items?`)) return

    try {
      const response = await fetch(`/api/menu/variants?variant_name=${encodeURIComponent(variantToRemove)}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      
      if (response.ok) {
        // Reload menu to get updated variants from database
        loadMenuItems()
        alert('✅ Variant removed from global list! This variant is no longer available for any menu items.')
      } else {
        console.error('Error removing variant:', result.error)
        alert('❌ Failed to remove variant')
      }
    } catch (error) {
      console.error('Error removing variant:', error)
      alert('❌ Failed to remove variant')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu items from database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">Menu Management</h2>
          <p className="text-gray-600">Edit item names, prices, and variants (Database Integration)</p>
        </div>
      </div>

      <div className="grid gap-6">
        {menuItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {editingItem === item.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="text-lg font-semibold border rounded px-3 py-2 w-full"
                      placeholder="Item name"
                    />
                    <input
                      type="number"
                      value={editingPrice}
                      onChange={(e) => setEditingPrice(Number(e.target.value))}
                      className="text-lg font-semibold border rounded px-3 py-2 w-32"
                      placeholder="Price"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={saveChanges}
                        className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.name}</h3>
                    <p className="text-xl font-bold text-green-600">₹{item.price}</p>
                    <button
                      onClick={() => startEditing(item)}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit Name & Price
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Variants Management */}
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">Variants:</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {item.variants.map((variant, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    <span>{variant}</span>
                    <button
                      onClick={() => removeVariant(item.id, variant)}
                      className="ml-2 text-red-500 hover:text-red-700 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new variant */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newVariant}
                  onChange={(e) => setNewVariant(e.target.value)}
                  placeholder="Add new variant (e.g., Paneer)"
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && addVariant(item.id)}
                />
                <button
                  onClick={() => addVariant(item.id)}
                  className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
                >
                  Add Variant
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Global Variant System:</strong> Variants are shared across ALL menu items. 
          Adding "Mutton" makes it available for all burgers. Removing "Beef" removes it from all menu items. 
          Changes are immediately reflected in the customer menu dropdowns.
        </p>
      </div>
    </div>
  )
}
