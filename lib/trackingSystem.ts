// Tracking system for managing order status updates

export type OrderStatus = 'waiting' | 'preparing' | 'ready' | 'completed'

export interface TrackingData {
  orderNumber: number
  verificationNumber: number
  status: OrderStatus
  timestamp: string
  lastUpdated: string
}

class TrackingSystem {
  private static instance: TrackingSystem
  private statusUpdates: Map<number, TrackingData> = new Map()
  private subscribers: Map<number, Array<(status: OrderStatus) => void>> = new Map()
  private currentOrderBeingPrepared: number | null = null
  private currentOrderSubscribers: Array<(orderNumber: number | null) => void> = []

  private constructor() {
    this.loadFromStorage()
  }

  public static getInstance(): TrackingSystem {
    if (!TrackingSystem.instance) {
      TrackingSystem.instance = new TrackingSystem()
    }
    return TrackingSystem.instance
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const savedTracking = localStorage.getItem('cafeOrderTracking')
      if (savedTracking) {
        const parsedData = JSON.parse(savedTracking)
        if (Array.isArray(parsedData)) {
          parsedData.forEach(([orderNumber, trackingData]) => {
            if (typeof orderNumber === 'number' && trackingData && typeof trackingData.status === 'string') {
              this.statusUpdates.set(orderNumber, trackingData)
            }
          })
        }
      }

      const savedCurrentOrder = localStorage.getItem('cafeCurrentOrderPreparing')
      if (savedCurrentOrder) {
        const parsed = parseInt(savedCurrentOrder, 10)
        if (!isNaN(parsed)) {
          this.currentOrderBeingPrepared = parsed
        }
      }
    } catch (error) {
      console.warn('Could not load tracking system from storage:', error)
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const dataToSave = Array.from(this.statusUpdates.entries())
      localStorage.setItem('cafeOrderTracking', JSON.stringify(dataToSave))
      
      if (this.currentOrderBeingPrepared !== null) {
        localStorage.setItem('cafeCurrentOrderPreparing', this.currentOrderBeingPrepared.toString())
      } else {
        localStorage.removeItem('cafeCurrentOrderPreparing')
      }
    } catch (error) {
      console.warn('Could not save tracking system to storage:', error)
    }
  }

  public initializeOrder(orderNumber: number, verificationNumber: number): void {
    const trackingData: TrackingData = {
      orderNumber,
      verificationNumber,
      status: 'waiting',
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }

    this.statusUpdates.set(orderNumber, trackingData)
    this.saveToStorage()
  }

  public updateOrderStatus(orderNumber: number, newStatus: OrderStatus): void {
    const existing = this.statusUpdates.get(orderNumber)
    if (existing) {
      const updated: TrackingData = {
        ...existing,
        status: newStatus,
        lastUpdated: new Date().toISOString()
      }

      this.statusUpdates.set(orderNumber, updated)
      this.saveToStorage()

      // Notify subscribers
      const orderSubscribers = this.subscribers.get(orderNumber) || []
      orderSubscribers.forEach(callback => callback(newStatus))
    }
  }

  public getOrderTracking(orderNumber: number): TrackingData | null {
    return this.statusUpdates.get(orderNumber) || null
  }

  public subscribeToOrder(orderNumber: number, callback: (status: OrderStatus) => void): () => void {
    if (!this.subscribers.has(orderNumber)) {
      this.subscribers.set(orderNumber, [])
    }

    this.subscribers.get(orderNumber)!.push(callback)

    // Return unsubscribe function
    return () => {
      const orderSubscribers = this.subscribers.get(orderNumber)
      if (orderSubscribers) {
        const index = orderSubscribers.indexOf(callback)
        if (index > -1) {
          orderSubscribers.splice(index, 1)
        }
      }
    }
  }

  // For testing/demo purposes - simulate status changes
  public simulateStatusUpdate(orderNumber: number): void {
    const current = this.getOrderTracking(orderNumber)
    if (current) {
      const nextStatus: OrderStatus = 
        current.status === 'waiting' ? 'preparing' :
        current.status === 'preparing' ? 'ready' : 'ready'
      
      this.updateOrderStatus(orderNumber, nextStatus)
    }
  }

  // Set which order is currently being prepared (owner dashboard function)
  public setCurrentOrderBeingPrepared(orderNumber: number | null): void {
    this.currentOrderBeingPrepared = orderNumber
    this.saveToStorage()
    
    // Notify all subscribers
    this.currentOrderSubscribers.forEach(callback => callback(orderNumber))
  }

  // Get current order being prepared
  public getCurrentOrderBeingPrepared(): number | null {
    return this.currentOrderBeingPrepared
  }

  // Subscribe to current order changes
  public subscribeToCurrentOrder(callback: (orderNumber: number | null) => void): () => void {
    this.currentOrderSubscribers.push(callback)

    // Return unsubscribe function
    return () => {
      const index = this.currentOrderSubscribers.indexOf(callback)
      if (index > -1) {
        this.currentOrderSubscribers.splice(index, 1)
      }
    }
  }

  // For development - reset system
  public resetSystem(): void {
    this.statusUpdates.clear()
    this.subscribers.clear()
    this.currentOrderBeingPrepared = null
    this.currentOrderSubscribers = []
    this.saveToStorage()
  }
}

export { TrackingSystem }