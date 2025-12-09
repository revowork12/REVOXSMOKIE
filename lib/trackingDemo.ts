// Demo utility for testing tracking system functionality
// This simulates what the owner dashboard will do later

import { TrackingSystem } from './trackingSystem'
import { HybridOrderSystem } from './supabaseIntegration'

export class TrackingDemo {
  private trackingSystem: TrackingSystem
  private hybridSystem: HybridOrderSystem

  constructor() {
    this.trackingSystem = TrackingSystem.getInstance()
    this.hybridSystem = HybridOrderSystem.getInstance()
  }

  // Simulate owner updating order status (enhanced for Supabase)
  public async updateOrderStatus(orderNumber: number, status: 'waiting' | 'preparing' | 'ready' | 'completed'): Promise<void> {
    try {
      // Try Supabase first, fallback to localStorage
      const success = await this.hybridSystem.updateOrderStatus(orderNumber, status)
      
      if (success) {
        // Also update local system for immediate UI feedback
        this.trackingSystem.updateOrderStatus(orderNumber, status)
        
        if (this.hybridSystem.isUsingSupabase()) {
          console.log(`✅ Demo: Updated order #${orderNumber} status to: ${status} (Supabase + Real-time)`)
        } else {
          console.log(`📱 Demo: Updated order #${orderNumber} status to: ${status} (localStorage)`)
        }
      } else {
        console.error(`❌ Demo: Failed to update order #${orderNumber} status`)
      }
    } catch (error) {
      console.error('Demo: Error updating order status:', error)
      // Fallback to local update
      this.trackingSystem.updateOrderStatus(orderNumber, status)
      console.log(`🔄 Demo: Fallback - Updated order #${orderNumber} status to: ${status} (localStorage only)`)
    }
  }

  // Auto-progress order status for testing (simulates kitchen workflow)
  public autoProgressOrder(orderNumber: number, delaySeconds: number = 10): void {
    const tracking = this.trackingSystem.getOrderTracking(orderNumber)
    if (!tracking) {
      console.warn(`Demo: Order #${orderNumber} not found for auto-progression`)
      return
    }

    const progressOrder = () => {
      const currentTracking = this.trackingSystem.getOrderTracking(orderNumber)
      if (!currentTracking) return

      switch (currentTracking.status) {
        case 'waiting':
          setTimeout(() => {
            this.updateOrderStatus(orderNumber, 'preparing')
            setTimeout(() => {
              this.updateOrderStatus(orderNumber, 'ready')
              setTimeout(() => {
                this.updateOrderStatus(orderNumber, 'completed')
              }, delaySeconds * 1000)
            }, delaySeconds * 1000)
          }, delaySeconds * 1000)
          break
        case 'preparing':
          setTimeout(() => {
            this.updateOrderStatus(orderNumber, 'ready')
            setTimeout(() => {
              this.updateOrderStatus(orderNumber, 'completed')
            }, delaySeconds * 1000)
          }, delaySeconds * 1000)
          break
        case 'ready':
          setTimeout(() => {
            this.updateOrderStatus(orderNumber, 'completed')
          }, delaySeconds * 1000)
          break
        case 'completed':
          console.log(`Demo: Order #${orderNumber} is already completed`)
          break
      }
    }

    progressOrder()
  }

  // Get all active orders
  public getAllOrders(): Array<{ orderNumber: number; status: string }> {
    const orders: Array<{ orderNumber: number; status: string }> = []
    
    // This would normally query the database
    // For demo, we'll check localStorage
    if (typeof window !== 'undefined') {
      try {
        const savedTracking = localStorage.getItem('cafeOrderTracking')
        if (savedTracking) {
          const parsedData = JSON.parse(savedTracking)
          if (Array.isArray(parsedData)) {
            parsedData.forEach(([orderNumber, trackingData]) => {
              orders.push({
                orderNumber,
                status: trackingData.status
              })
            })
          }
        }
      } catch (error) {
        console.warn('Demo: Could not load orders:', error)
      }
    }
    
    return orders
  }

  // Set current order being prepared (owner dashboard function - enhanced for Supabase)
  public async setCurrentOrderPreparing(orderNumber: number | null): Promise<void> {
    try {
      // Update both systems
      await this.hybridSystem.setCurrentOrderPreparing(orderNumber)
      this.trackingSystem.setCurrentOrderBeingPrepared(orderNumber)
      
      if (orderNumber) {
        if (this.hybridSystem.isUsingSupabase()) {
          console.log(`✅ Demo: Set current order being prepared to #${orderNumber} (Supabase + Real-time)`)
        } else {
          console.log(`📱 Demo: Set current order being prepared to #${orderNumber} (localStorage)`)
        }
      } else {
        console.log('🧹 Demo: Cleared current order being prepared')
      }
    } catch (error) {
      console.error('Demo: Error setting current order:', error)
      // Fallback to local update
      this.trackingSystem.setCurrentOrderBeingPrepared(orderNumber)
      console.log('🔄 Demo: Fallback - Updated current order locally')
    }
  }

  // Get current order being prepared
  public getCurrentOrderPreparing(): number | null {
    return this.trackingSystem.getCurrentOrderBeingPrepared()
  }

  // Reset all orders (for testing)
  public resetAllOrders(): void {
    this.trackingSystem.resetSystem()
    console.log('Demo: All orders reset')
  }
}

// Global demo instance - ONLY FOR DEVELOPMENT
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Security: Only expose demo functions in development mode
  ;(window as any).trackingDemo = new TrackingDemo()
  
  // Add console helper functions (development only)
  ;(window as any).updateOrderStatus = (orderNumber: number, status: 'waiting' | 'preparing' | 'ready' | 'completed') => {
    ;(window as any).trackingDemo.updateOrderStatus(orderNumber, status)
  }
  
  ;(window as any).autoProgressOrder = (orderNumber: number, delaySeconds: number = 5) => {
    ;(window as any).trackingDemo.autoProgressOrder(orderNumber, delaySeconds)
  }
  
  ;(window as any).getAllOrders = () => {
    return ;(window as any).trackingDemo.getAllOrders()
  }
  
  ;(window as any).resetAllOrders = () => {
    ;(window as any).trackingDemo.resetAllOrders()
  }

  ;(window as any).setCurrentOrderPreparing = (orderNumber: number | null) => {
    ;(window as any).trackingDemo.setCurrentOrderPreparing(orderNumber)
  }

  ;(window as any).getCurrentOrderPreparing = () => {
    return ;(window as any).trackingDemo.getCurrentOrderPreparing()
  }

  console.log(`
🎯 DEVELOPMENT MODE - Tracking Demo Loaded! Test commands:
• updateOrderStatus(1, 'preparing') - Update order #1 to preparing
• updateOrderStatus(1, 'ready') - Update order #1 to ready
• updateOrderStatus(1, 'completed') - Mark order #1 as completed (triggers redirect)
• autoProgressOrder(1, 5) - Auto-progress order #1 with 5sec delays (full cycle)
• setCurrentOrderPreparing(1) - Set order #1 as currently being prepared
• setCurrentOrderPreparing(null) - Clear current order being prepared
• getCurrentOrderPreparing() - Get current order being prepared
• getAllOrders() - View all active orders
• resetAllOrders() - Reset all tracking data

⚠️ WARNING: These functions are disabled in production for security!
  `)
} else if (typeof window !== 'undefined') {
  console.log('🔒 PRODUCTION MODE - Demo functions disabled for security')
}