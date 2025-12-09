// Integration layer between existing order system and Supabase
// This allows gradual migration from localStorage to Supabase

import { SecureSupabaseOrderManager as SupabaseOrderManager, generateCustomerSession, type OrderItem } from './supabase-secure'
import { SecurityManager } from './security'
import { MENU_ITEMS } from './constants'

export class HybridOrderSystem {
  private static instance: HybridOrderSystem
  private customerSession: string
  private useSupabase: boolean = false
  private fallbackToLocalStorage: boolean = true

  private constructor() {
    this.customerSession = generateCustomerSession()
    
    // Check if Supabase is configured
    this.checkSupabaseAvailability()
  }

  public static getInstance(): HybridOrderSystem {
    if (!HybridOrderSystem.instance) {
      HybridOrderSystem.instance = new HybridOrderSystem()
    }
    return HybridOrderSystem.instance
  }

  private async checkSupabaseAvailability(): Promise<void> {
    try {
      // Test Supabase connection
      const testResult = await SupabaseOrderManager.getCurrentOrderPreparing()
      this.useSupabase = true
      console.log('✅ Supabase connected - Using database for order management')
    } catch (error) {
      this.useSupabase = false
      
      // Check if it's a table doesn't exist error
      const errorCode = (error as any)?.code
      const errorMessage = (error as any)?.message
      if (errorCode === '42P01' || errorMessage?.includes('relation') || errorMessage?.includes('does not exist')) {
        console.log('🏗️ Database setup required - Using localStorage for now')
        console.log('📋 Quick setup: Run the SQL script "setup-database-now.sql" in Supabase')
        console.log('📊 Dashboard: https://supabase.com/dashboard → SQL Editor')
        console.log('4. Run the SQL script')
      } else {
        console.warn('⚠️ Supabase not available - Falling back to localStorage')
        console.log('To enable Supabase:')
        console.log('1. Add your Supabase URL and key to .env.local')
        console.log('2. Run the SQL schema in your Supabase dashboard')
      }
    }
  }

  // Create a new order (hybrid approach)
  public async createOrder(
    orderNumber: number,
    verificationNumber: number,
    items: any[], // Menu items with quantities
    totalAmount: number
  ): Promise<{ orderNumber: number; verificationNumber: number; timestamp: string }> {
    
    // Convert menu items to OrderItem format
    const orderItems: OrderItem[] = items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      emoji: item.emoji
    }))

    if (this.useSupabase) {
      try {
        // Create order in Supabase
        const dbOrder = await SupabaseOrderManager.createOrder(
          orderNumber,
          verificationNumber,
          orderItems,
          totalAmount,
          this.customerSession
        )

        return {
          orderNumber: dbOrder.order_number,
          verificationNumber: dbOrder.verification_no,
          timestamp: dbOrder.created_at
        }
      } catch (error) {
        console.error('Failed to create order in Supabase, falling back to localStorage:', error)
        
        if (this.fallbackToLocalStorage) {
          return this.createLocalOrder(orderNumber, verificationNumber, totalAmount)
        }
        throw error
      }
    } else {
      // Use localStorage fallback
      return this.createLocalOrder(orderNumber, verificationNumber, totalAmount)
    }
  }

  private createLocalOrder(
    orderNumber: number,
    verificationNumber: number,
    totalAmount: number
  ): { orderNumber: number; verificationNumber: number; timestamp: string } {
    // Fallback to original localStorage approach
    const timestamp = new Date().toISOString()
    
    try {
      const orderData = {
        orderNumber,
        verificationNumber,
        timestamp,
        totalAmount,
        status: 'waiting',
        customerSession: this.customerSession
      }

      // Store in localStorage with encryption
      const encryptionKey = 'cafe-order-system-key-2024'
      const encryptedData = SecurityManager.encryptData(JSON.stringify(orderData), encryptionKey)
      localStorage.setItem(`cafe-order-${orderNumber}`, encryptedData)

      return { orderNumber, verificationNumber, timestamp }
    } catch (error) {
      console.error('Failed to create local order:', error)
      throw error
    }
  }

  // Get order status (hybrid approach)
  public async getOrderStatus(
    orderNumber: number,
    verificationNumber: number
  ): Promise<'waiting' | 'preparing' | 'ready' | 'completed' | null> {
    
    if (this.useSupabase) {
      try {
        const order = await SupabaseOrderManager.getOrder(orderNumber, verificationNumber)
        return (order as any)?.status || null
      } catch (error) {
        console.error('Failed to get order from Supabase:', error)
        
        if (this.fallbackToLocalStorage) {
          return this.getLocalOrderStatus(orderNumber)
        }
        return null
      }
    } else {
      return this.getLocalOrderStatus(orderNumber)
    }
  }

  private getLocalOrderStatus(orderNumber: number): 'waiting' | 'preparing' | 'ready' | 'completed' | null {
    try {
      const encryptionKey = 'cafe-order-system-key-2024'
      const encryptedData = localStorage.getItem(`cafe-order-${orderNumber}`)
      
      if (!encryptedData) return null
      
      const decryptedData = SecurityManager.decryptData(encryptedData, encryptionKey)
      const orderData = JSON.parse(decryptedData)
      
      return orderData.status || 'waiting'
    } catch (error) {
      console.error('Failed to get local order status:', error)
      return null
    }
  }

  // Update order status (owner dashboard function)
  public async updateOrderStatus(
    orderNumber: number,
    newStatus: 'waiting' | 'preparing' | 'ready' | 'completed'
  ): Promise<boolean> {
    
    if (this.useSupabase) {
      try {
        await SupabaseOrderManager.updateOrderStatus(orderNumber, newStatus)
        return true
      } catch (error) {
        console.error('Failed to update order in Supabase:', error)
        
        if (this.fallbackToLocalStorage) {
          return this.updateLocalOrderStatus(orderNumber, newStatus)
        }
        return false
      }
    } else {
      return this.updateLocalOrderStatus(orderNumber, newStatus)
    }
  }

  private updateLocalOrderStatus(
    orderNumber: number,
    newStatus: 'waiting' | 'preparing' | 'ready' | 'completed'
  ): boolean {
    try {
      const encryptionKey = 'cafe-order-system-key-2024'
      const encryptedData = localStorage.getItem(`cafe-order-${orderNumber}`)
      
      if (!encryptedData) return false
      
      const decryptedData = SecurityManager.decryptData(encryptedData, encryptionKey)
      const orderData = JSON.parse(decryptedData)
      
      orderData.status = newStatus
      orderData.updatedAt = new Date().toISOString()
      
      const newEncryptedData = SecurityManager.encryptData(JSON.stringify(orderData), encryptionKey)
      localStorage.setItem(`cafe-order-${orderNumber}`, newEncryptedData)
      
      return true
    } catch (error) {
      console.error('Failed to update local order status:', error)
      return false
    }
  }

  // Subscribe to order status changes (real-time)
  public subscribeToOrderStatus(
    orderNumber: number,
    verificationNumber: number,
    callback: (status: string) => void
  ): () => void {
    
    if (this.useSupabase) {
      // Use Supabase real-time subscriptions
      return SupabaseOrderManager.subscribeToOrderStatus(orderNumber, verificationNumber, callback)
    } else {
      // Fallback to polling for localStorage
      const interval = setInterval(async () => {
        const status = await this.getOrderStatus(orderNumber, verificationNumber)
        if (status) {
          callback(status)
        }
      }, 2000) // Poll every 2 seconds

      return () => {
        clearInterval(interval)
      }
    }
  }

  // Get current order being prepared
  public async getCurrentOrderPreparing(): Promise<number | null> {
    if (this.useSupabase) {
      try {
        return await SupabaseOrderManager.getCurrentOrderPreparing()
      } catch (error) {
        console.error('Failed to get current order from Supabase:', error)
        return this.getLocalCurrentOrder()
      }
    } else {
      return this.getLocalCurrentOrder()
    }
  }

  private getLocalCurrentOrder(): number | null {
    try {
      const currentOrder = localStorage.getItem('cafe-current-order-preparing')
      return currentOrder ? parseInt(currentOrder, 10) : null
    } catch {
      return null
    }
  }

  // Set current order being prepared (owner dashboard)
  public async setCurrentOrderPreparing(orderNumber: number | null): Promise<void> {
    if (this.useSupabase) {
      try {
        await SupabaseOrderManager.setCurrentOrderPreparing(orderNumber)
      } catch (error) {
        console.error('Failed to set current order in Supabase:', error)
        this.setLocalCurrentOrder(orderNumber)
      }
    } else {
      this.setLocalCurrentOrder(orderNumber)
    }
  }

  private setLocalCurrentOrder(orderNumber: number | null): void {
    try {
      if (orderNumber === null) {
        localStorage.removeItem('cafe-current-order-preparing')
      } else {
        localStorage.setItem('cafe-current-order-preparing', orderNumber.toString())
      }
    } catch (error) {
      console.error('Failed to set local current order:', error)
    }
  }

  // Check if using Supabase
  public isUsingSupabase(): boolean {
    return this.useSupabase
  }

  // Get customer session
  public getCustomerSession(): string {
    return this.customerSession
  }
}