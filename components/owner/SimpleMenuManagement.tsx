'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface MenuItem {
  id: number
  base_name: string
  size_code: string
  protein: string
  price: number
  is_available: boolean
}

interface ProteinOption {
  id: number
  option_name: string
  is_active: boolean
}

export default function SimpleMenuManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [proteinOptions, setProteinOptions] = useState<ProteinOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddProtein, setShowAddProtein] = useState(false)
  const [newProteinName, setNewProteinName] = useState('')

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([loadMenuItems(), loadProteinOptions()])
    setLoading(false)
  }

  const loadMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('base_name', { ascending: true })
        .order('size_code', { ascending: true })
        .order('protein', { ascending: true })

      if (error) throw error
      setMenuItems(data || [])
    } catch (error) {
      console.error('Error loading menu items:', error)
    }
  }

  const loadProteinOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('variant_options')
        .select('*')
        .order('option_name')

      if (error) throw error
      setProteinOptions(data || [])
    } catch (error) {
      console.error('Error loading protein options:', error)
    }
  }

  // Toggle item availability
  const toggleItemAvailability = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus })
        .eq('id', id)

      if (error) throw error
      await loadMenuItems()
    } catch (error) {
      console.error('Error updating item availability:', error)
      alert('Failed to update item availability')
    }
  }

  // Delete specific item variant
  const deleteItemVariant = async (id: number, itemName: string) => {
    if (!confirm(`Are you sure you want to delete this variant of "${itemName}"?`)) return

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadMenuItems()
    } catch (error) {
      console.error('Error deleting item variant:', error)
      alert('Failed to delete item variant')
    }
  }

  // Add new protein option
  const addProteinOption = async () => {
    if (!newProteinName.trim()) return

    try {
      const { error } = await supabase
        .from('variant_options')
        .insert({ option_name: newProteinName.trim() })

      if (error) throw error
      
      setNewProteinName('')
      setShowAddProtein(false)
      await loadProteinOptions()
    } catch (error) {
      console.error('Error adding protein option:', error)
      alert('Failed to add protein option')
    }
  }

  // Toggle protein option
  const toggleProteinOption = async (id: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('variant_options')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      await loadProteinOptions()
    } catch (error) {
      console.error('Error updating protein option:', error)
      alert('Failed to update protein option')
    }
  }

  // Delete protein option
  const deleteProteinOption = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will affect all menu items using this protein.`)) return

    try {
      const { error } = await supabase
        .from('variant_options')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadProteinOptions()
      await loadMenuItems() // Reload menu items as they might be affected
    } catch (error) {
      console.error('Error deleting protein option:', error)
      alert('Failed to delete protein option')
    }
  }

  // Group menu items by base name and size
  const groupedItems = menuItems.reduce((acc, item) => {
    const key = `${item.base_name}_${item.size_code}`
    if (!acc[key]) {
      acc[key] = {
        base_name: item.base_name,
        size_code: item.size_code,
        variants: []
      }
    }
    acc[key].variants.push(item)
    return acc
  }, {} as Record<string, { base_name: string, size_code: string, variants: MenuItem[] }>)

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">Loading menu management...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Menu Management</h2>
        <p className="text-gray-600">Manage individual menu items and protein options</p>
      </div>

      {/* Protein Options Management */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Protein Options</h3>
          <button
            onClick={() => setShowAddProtein(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Add New Protein
          </button>
        </div>

        {showAddProtein && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={newProteinName}
                onChange={(e) => setNewProteinName(e.target.value)}
                placeholder="Enter protein name (e.g., Fish, Turkey)"
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <button
                onClick={addProteinOption}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAddProtein(false); setNewProteinName('') }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {proteinOptions.map((protein) => (
            <div key={protein.id} className={`p-3 border rounded-lg ${protein.is_active ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">{protein.option_name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleProteinOption(protein.id, protein.is_active)}
                    className={`px-2 py-1 text-xs rounded ${protein.is_active ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}
                  >
                    {protein.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => deleteProteinOption(protein.id, protein.option_name)}
                    className="px-2 py-1 text-xs bg-red-500 text-white rounded"
                  >
                    Del
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-4">
        {Object.values(groupedItems).map((group) => (
          <div key={`${group.base_name}_${group.size_code}`} className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {group.base_name} {group.size_code && `(${group.size_code})`}
            </h3>
            
            <div className="space-y-2">
              {group.variants.map((item) => (
                <div key={item.id} className={`flex items-center justify-between p-3 border rounded-lg ${item.is_available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 text-sm rounded ${item.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.is_available ? 'Available' : 'Hidden'}
                    </span>
                    <span className="font-medium">{item.protein}</span>
                    <span className="text-gray-600">₹{item.price}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleItemAvailability(item.id, item.is_available)}
                      className={`px-3 py-1 text-sm rounded ${item.is_available ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
                    >
                      {item.is_available ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => deleteItemVariant(item.id, `${item.base_name} (${item.size_code}) ${item.protein}`)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}