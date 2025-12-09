// Supabase client configuration for café order management with auth

import { createClient } from '@supabase/supabase-js'

// Types for database tables
export type Database = {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          order_number: number
          verification_number: number
          status: 'waiting' | 'preparing' | 'ready' | 'completed'
          items: any // JSONB type
          total_amount: number
          customer_session: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: number
          verification_number: number
          status?: 'waiting' | 'preparing' | 'ready' | 'completed'
          items: any // JSONB type
          total_amount: number
          customer_session: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: number
          verification_number?: number
          status?: 'waiting' | 'preparing' | 'ready' | 'completed'
          items?: any // JSONB type
          total_amount?: number
          customer_session?: string
          created_at?: string
          updated_at?: string
        }
      }
      order_tracking: {
        Row: {
          id: string
          order_number: number
          current_order_preparing: number | null
          last_updated: string
        }
        Insert: {
          id?: string
          order_number: number
          current_order_preparing?: number | null
          last_updated?: string
        }
        Update: {
          id?: string
          order_number?: number
          current_order_preparing?: number | null
          last_updated?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status: 'waiting' | 'preparing' | 'ready' | 'completed'
    }
  }
}

export interface OrderItem {
  id: number
  name: string
  quantity: number
  price: number
  emoji: string
}

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Only require Supabase config in browser/runtime, not during build
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey

if (!isSupabaseConfigured) {
  // Only warn, don't crash during build
  if (typeof window !== 'undefined') {
    console.warn('⚠️ Supabase not configured. Add environment variables to enable database features:')
    console.warn('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
    console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key')
  }
}

// Create Supabase client (simplified configuration)
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: false, // Disable auth persistence for anonymous users
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit real-time events
    },
  },
}) : null

// Database operation helpers
export class SupabaseOrderManager {
  // Create a new order in database
  static async createOrder(
    orderNumber: number,
    verificationNumber: number,
    items: OrderItem[],
    totalAmount: number,
    customerSession: string
  ) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          verification_number: verificationNumber,
          items,
          total_amount: totalAmount,
          customer_session: customerSession,
          status: 'waiting'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating order:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Failed to create order:', error)
      throw error
    }
  }

  // Get order by order number and verification
  static async getOrder(orderNumber: number, verificationNumber: number) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .eq('verification_number', verificationNumber)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching order:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Failed to fetch order:', error)
      return null
    }
  }

  // Update order status (owner dashboard function)
  static async updateOrderStatus(
    orderNumber: number,
    newStatus: 'waiting' | 'preparing' | 'ready' | 'completed'
  ) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('order_number', orderNumber)
        .select()
        .single()

      if (error) {
        console.error('Error updating order status:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Failed to update order status:', error)
      throw error
    }
  }

  // Set current order being prepared (owner dashboard)
  static async setCurrentOrderPreparing(orderNumber: number | null) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('order_tracking')
        .upsert({
          id: 'current-order', // Single row for current order tracking
          order_number: 1, // Placeholder, we use current_order_preparing field
          current_order_preparing: orderNumber,
          last_updated: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error setting current order:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Failed to set current order:', error)
      throw error
    }
  }

  // Get current order being prepared
  static async getCurrentOrderPreparing() {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('order_tracking')
        .select('current_order_preparing')
        .eq('id', 'current-order')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found, return null
          return null
        } else if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          // Table doesn't exist yet
          console.warn('Database tables not set up yet. Please run the schema in Supabase.')
          return null
        } else {
          console.error('Error getting current order:', error)
          throw error
        }
      }

      return data?.current_order_preparing || null
    } catch (error) {
      console.error('Failed to get current order:', error)
      return null
    }
  }

  // Subscribe to order status changes (real-time)
  static subscribeToOrderStatus(
    orderNumber: number,
    callback: (status: string) => void
  ) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }
    
    const subscription = supabase
      .channel(`order-${orderNumber}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `order_number=eq.${orderNumber}`
        },
        (payload) => {
          if (payload.new && 'status' in payload.new) {
            callback(payload.new.status as string)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  // Subscribe to current order being prepared changes (real-time)
  static subscribeToCurrentOrder(
    callback: (orderNumber: number | null) => void
  ) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }
    
    const subscription = supabase
      .channel('current-order-tracking')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_tracking',
          filter: 'id=eq.current-order'
        },
        (payload) => {
          if (payload.new && 'current_order_preparing' in payload.new) {
            callback(payload.new.current_order_preparing as number | null)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  // Get all active orders (for owner dashboard)
  static async getAllActiveOrders() {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['waiting', 'preparing', 'ready'])
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching active orders:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch active orders:', error)
      return []
    }
  }
}

// Generate customer session ID for tracking
export function generateCustomerSession(): string {
  // Create a unique session identifier for this customer
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 9)
  return `customer_${timestamp}_${random}`
}

// Create auth-enabled client for components
export const createSupabaseClient = () => {
  if (!isSupabaseConfigured) return null
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  })
}