// Order system for managing order numbers and verification codes

interface OrderData {
  orderNumber: number
  verificationNumber: number
  timestamp: string // Changed from Date to string for JSON serialization
}

class OrderSystem {
  private static instance: OrderSystem
  private usedVerificationNumbers: Set<number> = new Set()
  private currentOrderNumber: number = 1
  private orders: OrderData[] = []

  private constructor() {
    // Load from localStorage if available
    this.loadFromStorage()
  }

  public static getInstance(): OrderSystem {
    if (!OrderSystem.instance) {
      OrderSystem.instance = new OrderSystem()
    }
    return OrderSystem.instance
  }

  private loadFromStorage(): void {
    // Only run on client side
    if (typeof window === 'undefined') return

    try {
      const savedOrders = localStorage.getItem('cafeOrders')
      const savedOrderNumber = localStorage.getItem('cafeOrderNumber')
      const savedVerificationNumbers = localStorage.getItem('cafeVerificationNumbers')
      
      const encryptionKey = 'cafe-order-system-key-2024'

      if (savedOrders) {
        try {
          // Try to decrypt first (new format)
          const decryptedOrders = this.decryptData(savedOrders, encryptionKey)
          const parsedOrders = JSON.parse(decryptedOrders)
          
          if (Array.isArray(parsedOrders)) {
            this.orders = parsedOrders.filter(order => 
              order && 
              typeof order.orderNumber === 'number' && 
              typeof order.verificationNumber === 'number' &&
              typeof order.timestamp === 'string'
            )
          }
        } catch {
          // Fallback to plain text (old format) - for backward compatibility
          try {
            const parsedOrders = JSON.parse(savedOrders)
            if (Array.isArray(parsedOrders)) {
              this.orders = parsedOrders.filter(order => 
                order && 
                typeof order.orderNumber === 'number' && 
                typeof order.verificationNumber === 'number' &&
                typeof order.timestamp === 'string'
              )
              // Re-save in encrypted format
              this.saveToStorage()
            }
          } catch {
            console.warn('Could not parse orders data')
          }
        }
      }

      if (savedOrderNumber) {
        const parsed = parseInt(savedOrderNumber, 10)
        if (!isNaN(parsed) && parsed > 0 && parsed < 1000000) { // Security: reasonable upper limit
          this.currentOrderNumber = parsed
        }
      }

      if (savedVerificationNumbers) {
        try {
          // Try to decrypt first (new format)
          const decryptedNumbers = this.decryptData(savedVerificationNumbers, encryptionKey)
          const numbers = JSON.parse(decryptedNumbers)
          
          if (Array.isArray(numbers)) {
            this.usedVerificationNumbers = new Set(numbers.filter(n => typeof n === 'number' && n >= 10000 && n <= 99999))
          }
        } catch {
          // Fallback to plain text (old format)
          try {
            const numbers = JSON.parse(savedVerificationNumbers)
            if (Array.isArray(numbers)) {
              this.usedVerificationNumbers = new Set(numbers.filter(n => typeof n === 'number' && n >= 10000 && n <= 99999))
              // Re-save in encrypted format
              this.saveToStorage()
            }
          } catch {
            console.warn('Could not parse verification numbers data')
          }
        }
      }
    } catch (error) {
      console.warn('Could not load order system from storage:', error)
      // Reset to defaults on error
      this.currentOrderNumber = 1
      this.usedVerificationNumbers.clear()
      this.orders = []
    }
  }

  private saveToStorage(): void {
    // Only run on client side
    if (typeof window === 'undefined') return

    try {
      // Security: Encrypt sensitive data before storing
      const encryptionKey = 'cafe-order-system-key-2024' // In production, use proper key management
      
      const ordersData = JSON.stringify(this.orders)
      const encryptedOrders = this.encryptData(ordersData, encryptionKey)
      
      const verificationData = JSON.stringify(Array.from(this.usedVerificationNumbers))
      const encryptedVerifications = this.encryptData(verificationData, encryptionKey)
      
      localStorage.setItem('cafeOrders', encryptedOrders)
      localStorage.setItem('cafeOrderNumber', this.currentOrderNumber.toString()) // Order number can be plain
      localStorage.setItem('cafeVerificationNumbers', encryptedVerifications)
    } catch (error) {
      console.warn('Could not save order system to storage:', error)
    }
  }

  private encryptData(data: string, key: string): string {
    // Simple encryption - in production use proper encryption
    let encrypted = ''
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      )
    }
    return btoa(encrypted)
  }

  private decryptData(encryptedData: string, key: string): string {
    try {
      const encrypted = atob(encryptedData)
      let decrypted = ''
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        )
      }
      return decrypted
    } catch {
      return ''
    }
  }

  private generateUniqueVerificationNumber(): number {
    let verificationNumber: number
    let attempts = 0
    const maxAttempts = 1000

    do {
      verificationNumber = Math.floor(10000 + Math.random() * 90000) // 5-digit number (10000-99999)
      attempts++
      
      if (attempts > maxAttempts) {
        throw new Error('Could not generate unique verification number')
      }
    } while (this.usedVerificationNumbers.has(verificationNumber))

    this.usedVerificationNumbers.add(verificationNumber)
    return verificationNumber
  }

  public createNewOrder(): OrderData {
    // Atomic operation to prevent race conditions
    const orderNumber = this.currentOrderNumber
    this.currentOrderNumber++ // Increment immediately to prevent duplicates
    
    try {
      const verificationNumber = this.generateUniqueVerificationNumber()
      const timestamp = new Date().toISOString()

      const newOrder: OrderData = {
        orderNumber,
        verificationNumber,
        timestamp
      }

      this.orders.push(newOrder)
      
      // Save to storage
      this.saveToStorage()

      return newOrder
    } catch (error) {
      // Rollback order number on error
      this.currentOrderNumber--
      throw error
    }
  }

  public getOrderHistory(): OrderData[] {
    return [...this.orders]
  }

  // For testing purposes - reset system (remove in production)
  public resetSystem(): void {
    this.currentOrderNumber = 1
    this.usedVerificationNumbers.clear()
    this.orders = []
    this.saveToStorage()
  }
}

export { OrderSystem, type OrderData }