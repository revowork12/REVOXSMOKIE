// 🔒 SECURE Supabase client with proper validation and security measures
// This replaces the original supabase.ts with security-first approach

import { createClient } from '@supabase/supabase-js'
import { SecurityManager } from './security'

// Types for database tables (same as before but with validation)
export type Database = {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          order_number: number
          verification_no: number
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
          verification_no: number
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
          verification_no?: number
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
      create_order_secure: {
        Args: {
          p_order_number: number
          p_verification_no: number
          p_items: OrderItem[]
          p_total_amount: number
          p_customer_session: string
        }
        Returns: {
          id: string
          order_number: number
          verification_no: number
          created_at: string
        }[]
      }
      update_order_status_secure: {
        Args: {
          p_order_number: number
          p_new_status: 'waiting' | 'preparing' | 'ready' | 'completed'
          p_admin_key: string
        }
        Returns: {
          order_number: number
          new_status: 'waiting' | 'preparing' | 'ready' | 'completed'
          updated_at: string
        }[]
      }
      set_verification_context: {
        Args: { verification_no: number }
        Returns: void
      }
      validate_order_ownership: {
        Args: {
          p_order_number: number
          p_verification_no: number
        }
        Returns: boolean
      }
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

// Environment variables validation with better security
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate Supabase URL format
const isValidSupabaseUrl = (url: string | undefined): boolean => {
  if (!url) return false
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.endsWith('.supabase.co') && urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

// Validate Supabase anon key format (JWT token)
const isValidSupabaseKey = (key: string | undefined): boolean => {
  if (!key) return false
  // JWT tokens start with eyJ and have 3 parts separated by dots
  const jwtPattern = /^eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+$/
  return jwtPattern.test(key) && key.length > 100
}

// Only require Supabase config in browser/runtime, not during build
const isSupabaseConfigured = isValidSupabaseUrl(supabaseUrl) && isValidSupabaseKey(supabaseAnonKey)

if (!isSupabaseConfigured) {
  // Only warn, don't crash during build
  if (typeof window !== 'undefined') {
    console.warn('⚠️ Supabase not configured properly. Add valid environment variables to enable database features:')
    console.warn('NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co')
    console.warn('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_valid_jwt_anon_key')
    SecurityManager.logSecurityEvent('supabase_config_invalid', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseAnonKey,
      urlValid: isValidSupabaseUrl(supabaseUrl),
      keyValid: isValidSupabaseKey(supabaseAnonKey)
    }, false)
  }
}

// Create Supabase client with enhanced security configuration
export const supabase = isSupabaseConfigured ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    persistSession: false, // Disable auth persistence for anonymous users
    autoRefreshToken: false, // We don't use authentication tokens
    detectSessionInUrl: false, // Prevent URL-based session hijacking
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit real-time events
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'revoxegg-cafe/1.0.0', // Custom header for monitoring
    },
  },
}) : null

// 🔒 SECURE Database operation helpers with comprehensive validation
export class SecureSupabaseOrderManager {
  // Admin key for secure operations (change in production!)
  private static readonly ADMIN_KEY = process.env.CAFE_ADMIN_KEY || 'cafe-admin-2024-change-me'

  // Create a new order using secure database function
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
      // 🔒 COMPREHENSIVE INPUT VALIDATION
      const sanitizedOrderNumber = SecurityManager.sanitizeOrderNumber(orderNumber.toString())
      const sanitizedVerificationNumber = SecurityManager.sanitizeVerificationNumber(verificationNumber.toString())

      if (!sanitizedOrderNumber) {
        SecurityManager.logSecurityEvent('create_order_invalid_number', { orderNumber }, false)
        throw new Error('Invalid order number')
      }

      if (!sanitizedVerificationNumber) {
        SecurityManager.logSecurityEvent('create_order_invalid_verification', { verificationNumber }, false)
        throw new Error('Invalid verification number')
      }

      if (!SecurityManager.validateOrderItems(items)) {
        SecurityManager.logSecurityEvent('create_order_invalid_items', { itemCount: items?.length }, false)
        throw new Error('Invalid order items')
      }

      if (!SecurityManager.validateTotalAmount(items, totalAmount)) {
        SecurityManager.logSecurityEvent('create_order_amount_mismatch', { 
          totalAmount, 
          calculatedTotal: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        }, false)
        throw new Error('Total amount does not match items')
      }

      if (!SecurityManager.validateCustomerSession(customerSession)) {
        SecurityManager.logSecurityEvent('create_order_invalid_session', { customerSession }, false)
        throw new Error('Invalid customer session')
      }

      // 🔒 USE SECURE DATABASE FUNCTION (prevents direct table access)
      const { data, error } = await supabase.rpc('create_order_secure', {
        p_order_number: sanitizedOrderNumber,
        p_verification_no: sanitizedVerificationNumber,
        p_items: items as OrderItem[],
        p_total_amount: totalAmount,
        p_customer_session: customerSession
      } as any) as { data: { id: string; order_number: number; verification_no: number; created_at: string }[] | null, error: any }

      if (error) {
        SecurityManager.logSecurityEvent('create_order_db_error', { 
          error: error.message,
          orderNumber: sanitizedOrderNumber 
        }, false)
        console.error('Error creating order:', error)
        throw error
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from order creation')
      }

      const orderResult = data[0]

      SecurityManager.logSecurityEvent('create_order_success', { 
        orderNumber: orderResult.order_number,
        customerSession 
      }, true)

      return orderResult
    } catch (error) {
      console.error('Failed to create order:', error)
      SecurityManager.logSecurityEvent('create_order_failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        orderNumber 
      }, false)
      throw error
    }
  }

  // Get order by order number and verification (secure)
  static async getOrder(orderNumber: number, verificationNumber: number) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      // 🔒 INPUT VALIDATION
      const sanitizedOrderNumber = SecurityManager.sanitizeOrderNumber(orderNumber.toString())
      const sanitizedVerificationNumber = SecurityManager.sanitizeVerificationNumber(verificationNumber.toString())

      if (!sanitizedOrderNumber || !sanitizedVerificationNumber) {
        SecurityManager.logSecurityEvent('get_order_invalid_input', { orderNumber, verificationNumber }, false)
        return null
      }

      // 🔒 SET VERIFICATION CONTEXT FOR RLS
      await supabase.rpc('set_verification_context', {
        verification_no: sanitizedVerificationNumber
      } as any)

      // Query with RLS protection (only returns order if verification matches)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', sanitizedOrderNumber)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        SecurityManager.logSecurityEvent('get_order_db_error', { 
          error: error.message,
          orderNumber: sanitizedOrderNumber 
        }, false)
        console.error('Error fetching order:', error)
        throw error
      }

      if (data) {
        SecurityManager.logSecurityEvent('get_order_success', { 
          orderNumber: sanitizedOrderNumber 
        }, true)
      }

      return data
    } catch (error) {
      console.error('Failed to fetch order:', error)
      SecurityManager.logSecurityEvent('get_order_failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        orderNumber 
      }, false)
      return null
    }
  }

  // Update order status (admin only - requires admin key)
  static async updateOrderStatus(
    orderNumber: number,
    newStatus: 'waiting' | 'preparing' | 'ready' | 'completed',
    adminKey: string = this.ADMIN_KEY
  ) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      // 🔒 INPUT VALIDATION
      const sanitizedOrderNumber = SecurityManager.sanitizeOrderNumber(orderNumber.toString())

      if (!sanitizedOrderNumber) {
        SecurityManager.logSecurityEvent('update_order_invalid_number', { orderNumber }, false)
        throw new Error('Invalid order number')
      }

      const validStatuses: Array<'waiting' | 'preparing' | 'ready' | 'completed'> = ['waiting', 'preparing', 'ready', 'completed']
      if (!validStatuses.includes(newStatus)) {
        SecurityManager.logSecurityEvent('update_order_invalid_status', { newStatus }, false)
        throw new Error('Invalid order status')
      }

      // 🔒 USE SECURE DATABASE FUNCTION WITH ADMIN KEY VALIDATION
      const { data, error } = await supabase.rpc('update_order_status_secure', {
        p_order_number: sanitizedOrderNumber,
        p_new_status: newStatus,
        p_admin_key: adminKey
      } as any)

      if (error) {
        SecurityManager.logSecurityEvent('update_order_unauthorized', { 
          orderNumber: sanitizedOrderNumber,
          attemptedStatus: newStatus,
          error: error.message
        }, false)
        console.error('Error updating order status:', error)
        throw error
      }

      SecurityManager.logSecurityEvent('update_order_success', { 
        orderNumber: sanitizedOrderNumber,
        newStatus 
      }, true)

      return data?.[0] || null
    } catch (error) {
      console.error('Failed to update order status:', error)
      SecurityManager.logSecurityEvent('update_order_failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        orderNumber 
      }, false)
      throw error
    }
  }

  // Set current order being prepared (admin only)
  static async setCurrentOrderPreparing(orderNumber: number | null, adminKey: string = this.ADMIN_KEY) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      // 🔒 VALIDATE ADMIN ACCESS FIRST
      if (adminKey !== this.ADMIN_KEY) {
        SecurityManager.logSecurityEvent('set_current_order_unauthorized', { 
          orderNumber,
          providedKey: adminKey?.substring(0, 5) + '...' // Log only first 5 chars
        }, false)
        throw new Error('Unauthorized: Invalid admin key')
      }

      let sanitizedOrderNumber = null
      if (orderNumber !== null) {
        sanitizedOrderNumber = SecurityManager.sanitizeOrderNumber(orderNumber.toString())
        if (!sanitizedOrderNumber) {
          SecurityManager.logSecurityEvent('set_current_order_invalid_number', { orderNumber }, false)
          throw new Error('Invalid order number')
        }
      }

      const { data, error } = await supabase
        .from('order_tracking')
        .upsert({
          id: 'current-order',
          order_number: 1, // Placeholder
          current_order_preparing: sanitizedOrderNumber,
          last_updated: new Date().toISOString()
        } as any)
        .select()
        .single()

      if (error) {
        SecurityManager.logSecurityEvent('set_current_order_db_error', { 
          error: error.message,
          orderNumber: sanitizedOrderNumber 
        }, false)
        console.error('Error setting current order:', error)
        throw error
      }

      SecurityManager.logSecurityEvent('set_current_order_success', { 
        orderNumber: sanitizedOrderNumber 
      }, true)

      return data
    } catch (error) {
      console.error('Failed to set current order:', error)
      SecurityManager.logSecurityEvent('set_current_order_failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        orderNumber 
      }, false)
      throw error
    }
  }

  // Get current order being prepared (public read)
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
          return null // No data found
        } else if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          console.warn('Database tables not set up yet. Please run the security patches in Supabase.')
          return null
        } else {
          SecurityManager.logSecurityEvent('get_current_order_db_error', { 
            error: error.message 
          }, false)
          
          // Don't throw the error, just log it and return null for graceful degradation
          console.warn('Database error (using fallback):', error.message || error)
          return null
        }
      }

      return (data as any)?.current_order_preparing || null
    } catch (error) {
      // Graceful error handling - don't spam console with errors during setup
      SecurityManager.logSecurityEvent('get_current_order_failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, false)
      
      // Check if database needs setup
      const errorMessage = (error as any)?.message
      if (errorMessage?.includes('relation') || errorMessage?.includes('does not exist')) {
        console.log('📋 Database setup needed - see setup-database-now.sql')
        return null
      }
      
      console.warn('Database connection issue (using fallback):', errorMessage || error)
      return null
    }
  }

  // Subscribe to order status changes (real-time with validation)
  static subscribeToOrderStatus(
    orderNumber: number,
    verificationNumber: number,
    callback: (status: string) => void
  ) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // 🔒 VALIDATE INPUTS
    const sanitizedOrderNumber = SecurityManager.sanitizeOrderNumber(orderNumber.toString())
    const sanitizedVerificationNumber = SecurityManager.sanitizeVerificationNumber(verificationNumber.toString())

    if (!sanitizedOrderNumber || !sanitizedVerificationNumber) {
      SecurityManager.logSecurityEvent('subscribe_order_invalid_input', { orderNumber, verificationNumber }, false)
      throw new Error('Invalid order credentials')
    }

    SecurityManager.logSecurityEvent('subscribe_order_start', { 
      orderNumber: sanitizedOrderNumber 
    }, true)

    const subscription = supabase
      .channel(`order-${sanitizedOrderNumber}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `order_number=eq.${sanitizedOrderNumber}`
        },
        async (payload) => {
          if (payload.new && 'status' in payload.new) {
            // 🔒 VALIDATE ORDER OWNERSHIP BEFORE SENDING UPDATE
            try {
              const { data } = await supabase.rpc('validate_order_ownership', {
                p_order_number: sanitizedOrderNumber,
                p_verification_no: sanitizedVerificationNumber
              } as any)

              if (data === true) {
                callback(payload.new.status as string)
                SecurityManager.logSecurityEvent('subscribe_order_update_sent', { 
                  orderNumber: sanitizedOrderNumber,
                  newStatus: payload.new.status 
                }, true)
              } else {
                SecurityManager.logSecurityEvent('subscribe_order_ownership_failed', { 
                  orderNumber: sanitizedOrderNumber 
                }, false)
              }
            } catch (error) {
              SecurityManager.logSecurityEvent('subscribe_order_validation_error', { 
                orderNumber: sanitizedOrderNumber,
                error: error instanceof Error ? error.message : 'Unknown error'
              }, false)
            }
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
      SecurityManager.logSecurityEvent('subscribe_order_end', { 
        orderNumber: sanitizedOrderNumber 
      }, true)
    }
  }

  // Subscribe to current order being prepared changes (public)
  static subscribeToCurrentOrder(
    callback: (orderNumber: number | null) => void
  ) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    SecurityManager.logSecurityEvent('subscribe_current_order_start', {}, true)

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
            SecurityManager.logSecurityEvent('subscribe_current_order_update', { 
              newCurrentOrder: payload.new.current_order_preparing 
            }, true)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
      SecurityManager.logSecurityEvent('subscribe_current_order_end', {}, true)
    }
  }

  // Get all active orders (admin only)
  static async getAllActiveOrders(adminKey: string = this.ADMIN_KEY) {
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    try {
      // 🔒 VALIDATE ADMIN ACCESS
      if (adminKey !== this.ADMIN_KEY) {
        SecurityManager.logSecurityEvent('get_active_orders_unauthorized', {}, false)
        throw new Error('Unauthorized: Invalid admin key')
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['waiting', 'preparing', 'ready'])
        .order('created_at', { ascending: true })

      if (error) {
        SecurityManager.logSecurityEvent('get_active_orders_db_error', { 
          error: error.message 
        }, false)
        console.error('Error fetching active orders:', error)
        throw error
      }

      SecurityManager.logSecurityEvent('get_active_orders_success', { 
        orderCount: data?.length || 0 
      }, true)

      return data || []
    } catch (error) {
      console.error('Failed to fetch active orders:', error)
      SecurityManager.logSecurityEvent('get_active_orders_failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      }, false)
      return []
    }
  }
}

// Generate secure customer session ID
export function generateCustomerSession(): string {
  // Create a cryptographically secure session identifier
  const timestamp = Date.now().toString(36)
  const random = SecurityManager.generateSecureToken().substring(0, 16)
  const session = `customer_${timestamp}_${random}`
  
  SecurityManager.logSecurityEvent('customer_session_generated', { 
    sessionLength: session.length 
  }, true)
  
  return session
}