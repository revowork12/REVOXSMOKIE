// Shop Management System for RevoxEgg Café
import { supabase } from './supabase'

// TypeScript types for shop management
export interface ShopSettings {
  id: string
  is_open: boolean
  shop_name: string
  opening_time: string
  closing_time: string
  announcement: string
  last_updated: string
}

export interface MenuCategory {
  id: string
  name: string
  description: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

export interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string | null
  image_url: string | null
  available_quantity: number
  min_stock_alert: number
  is_available: boolean
  is_featured: boolean
  prep_time_minutes: number
  ingredients: string[]
  allergens: string[]
  calories: number | null
  display_order: number
  created_at: string
  updated_at: string
  category?: MenuCategory
}

export interface InventoryLog {
  id: string
  menu_item_id: string
  action_type: 'restock' | 'sale' | 'waste' | 'adjustment'
  quantity_change: number
  previous_quantity: number
  new_quantity: number
  reason: string | null
  created_by: string
  created_at: string
  menu_item?: MenuItem
}

export class ShopManager {
  // Shop status management
  static async getShopSettings(): Promise<ShopSettings | null> {
    if (!supabase) return null
    
    try {
      const { data, error } = await supabase
        .from('shop_settings')
        .select('*')
        .eq('id', 'main-shop')
        .single()

      if (error) {
        console.error('Error getting shop settings:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching shop settings:', error)
      return null
    }
  }

  static async toggleShopStatus(): Promise<boolean> {
    if (!supabase) return false
    
    try {
      const { data, error } = await supabase.rpc('toggle_shop_status')

      if (error) {
        console.error('Error toggling shop status:', error)
        return false
      }

      console.log('Shop status toggled:', data ? 'OPEN' : 'CLOSED')
      return data
    } catch (error) {
      console.error('Error toggling shop status:', error)
      return false
    }
  }

  static async updateShopSettings(settings: Partial<ShopSettings>): Promise<boolean> {
    if (!supabase) {
      console.error('Supabase client not available')
      return false
    }
    
    try {
      const { error } = await supabase
        .from('shop_settings')
        .update({
          ...settings,
          last_updated: new Date().toISOString()
        })
        .eq('id', 'main-shop')

      if (error) {
        console.error('Error updating shop settings:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating shop settings:', error)
      return false
    }
  }

  // Menu category management
  static async getMenuCategories(): Promise<MenuCategory[]> {
    if (!supabase) return []
    
    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (error) {
        console.error('Error getting menu categories:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching menu categories:', error)
      return []
    }
  }

  static async createMenuCategory(category: Omit<MenuCategory, 'id' | 'created_at'>): Promise<MenuCategory | null> {
    if (!supabase) return null
    
    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .insert([category])
        .select()
        .single()

      if (error) {
        console.error('Error creating menu category:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating menu category:', error)
      return null
    }
  }

  // Menu item management
  static async getMenuItems(includeUnavailable = false): Promise<MenuItem[]> {
    try {
if (!supabase) {
  throw new Error("Supabase client is not initialized");
}
      
let query = supabase
        .from('menu_items')
        .select(`
          *,
          category:menu_categories(*)
        `)
        .order('display_order')

      if (!includeUnavailable) {
        query = query.eq('is_available', true)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting menu items:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching menu items:', error)
      return []
    }
  }

  static async createMenuItem(item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at' | 'category'>): Promise<MenuItem | null> {
    if (!supabase) return null
    
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .insert([item])
        .select()
        .single()

      if (error) {
        console.error('Error creating menu item:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating menu item:', error)
      return null
    }
  }

  static async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<boolean> {
    if (!supabase) return false
    
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Error updating menu item:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating menu item:', error)
      return false
    }
  }

  static async deleteMenuItem(id: string): Promise<boolean> {
    if (!supabase) return false
    
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting menu item:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting menu item:', error)
      return false
    }
  }

  // Inventory management
  static async updateItemQuantity(itemId: string, quantityChange: number, reason = 'manual_adjustment'): Promise<boolean> {
    if (!supabase) return false
    
    try {
      const { error } = await supabase.rpc('update_item_quantity', {
        item_id: itemId,
        quantity_change: quantityChange,
        action_reason: reason
      })

      if (error) {
        console.error('Error updating item quantity:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating item quantity:', error)
      return false
    }
  }

  static async getInventoryLogs(itemId?: string): Promise<InventoryLog[]> {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }
    
    try {
      let query = supabase
        .from('inventory_logs')
        .select(`
          *,
          menu_item:menu_items(name)
        `)
        .order('created_at', { ascending: false })

      if (itemId) {
        query = query.eq('menu_item_id', itemId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error getting inventory logs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching inventory logs:', error)
      return []
    }
  }

  static async getLowStockItems(): Promise<MenuItem[]> {
    if (!supabase) return []
    
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          category:menu_categories(*)
        `)
        .filter('available_quantity', 'lte', 'min_stock_alert')
        .eq('is_available', true)

      if (error) {
        console.error('Error getting low stock items:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching low stock items:', error)
      return []
    }
  }

  // Real-time subscriptions
  static subscribeToShopStatus(callback: (settings: ShopSettings) => void) {
    if (!supabase) return null
    
    return supabase
      .channel('shop_status')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'shop_settings' },
        (payload) => callback(payload.new as ShopSettings)
      )
      .subscribe()
  }

  static subscribeToMenuItems(callback: (item: MenuItem) => void) {
    if (!supabase) return null
    
    return supabase
      .channel('menu_items')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'menu_items' },
        (payload) => callback(payload.new as MenuItem)
      )
      .subscribe()
  }
}

export default ShopManager