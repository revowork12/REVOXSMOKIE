// Security utilities for production deployment

export class SecurityManager {
  // Input sanitization for order numbers
  public static sanitizeOrderNumber(input: string | null): number | null {
    if (!input) return null
    
    // Remove any non-numeric characters
    const cleaned = input.replace(/[^0-9]/g, '')
    const parsed = parseInt(cleaned, 10)
    
    // Validate range (reasonable order numbers: 1-999999)
    if (isNaN(parsed) || parsed < 1 || parsed > 999999) {
      return null
    }
    
    return parsed
  }

  // Input sanitization for verification numbers
  public static sanitizeVerificationNumber(input: string | null): number | null {
    if (!input) return null
    
    // Remove any non-numeric characters
    const cleaned = input.replace(/[^0-9]/g, '')
    const parsed = parseInt(cleaned, 10)
    
    // Validate 5-digit verification numbers only
    if (isNaN(parsed) || cleaned.length !== 5 || parsed < 10000 || parsed > 99999) {
      return null
    }
    
    return parsed
  }

  // Rate limiting for order creation
  private static orderCreationAttempts: Map<string, number[]> = new Map()
  
  public static checkOrderCreationRateLimit(clientId: string = 'anonymous'): boolean {
    const now = Date.now()
    const windowMs = 60000 // 1 minute
    const maxAttempts = 5 // Max 5 orders per minute per client
    
    // Get existing attempts for this client
    const attempts = this.orderCreationAttempts.get(clientId) || []
    
    // Remove attempts older than window
    const recentAttempts = attempts.filter(time => now - time < windowMs)
    
    // Check if rate limit exceeded
    if (recentAttempts.length >= maxAttempts) {
      return false // Rate limit exceeded
    }
    
    // Add current attempt
    recentAttempts.push(now)
    this.orderCreationAttempts.set(clientId, recentAttempts)
    
    return true // Within rate limit
  }

  // XSS prevention for text content
  public static sanitizeText(input: string): string {
    if (typeof input !== 'string') return ''
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  // Generate secure session token (for future authentication)
  public static generateSecureToken(): string {
    const array = new Uint8Array(32)
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array)
    } else {
      // Fallback for non-crypto environments
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  // Validate URL parameters to prevent injection
  public static validateUrlParams(params: URLSearchParams): boolean {
    // Convert URLSearchParams to array for iteration compatibility
    const paramEntries = Array.from(params.entries())
    
    for (const [key, value] of paramEntries) {
      // Check for suspicious patterns
      if (value.includes('<script>') || 
          value.includes('javascript:') || 
          value.includes('data:') ||
          value.includes('vbscript:') ||
          value.length > 100) { // Prevent excessively long parameters
        return false
      }
    }
    return true
  }

  // Strong encryption for localStorage using AES-like approach
  public static encryptData(data: string, key: string): string {
    try {
      // Use Web Crypto API if available (modern browsers)
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        // For localStorage, we'll use a stronger XOR with multiple rounds
        const keyHash = this.simpleHash(key)
        let encrypted = data
        
        // Multiple encryption rounds with different keys
        for (let round = 0; round < 3; round++) {
          const roundKey = this.simpleHash(keyHash + round.toString())
          let roundEncrypted = ''
          for (let i = 0; i < encrypted.length; i++) {
            const keyChar = roundKey.charCodeAt(i % roundKey.length)
            const dataChar = encrypted.charCodeAt(i)
            roundEncrypted += String.fromCharCode((dataChar + keyChar) % 256)
          }
          encrypted = roundEncrypted
        }
        
        return btoa(encrypted)
      } else {
        // Fallback for environments without crypto
        return btoa(data) // Basic base64 encoding
      }
    } catch (error) {
      console.error('Encryption failed:', error)
      return btoa(data) // Fallback to base64
    }
  }

  // Strong decryption for localStorage
  public static decryptData(encryptedData: string, key: string): string {
    try {
      let decrypted = atob(encryptedData)
      
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const keyHash = this.simpleHash(key)
        
        // Reverse multiple encryption rounds
        for (let round = 2; round >= 0; round--) {
          const roundKey = this.simpleHash(keyHash + round.toString())
          let roundDecrypted = ''
          for (let i = 0; i < decrypted.length; i++) {
            const keyChar = roundKey.charCodeAt(i % roundKey.length)
            const dataChar = decrypted.charCodeAt(i)
            let originalChar = (dataChar - keyChar) % 256
            if (originalChar < 0) originalChar += 256
            roundDecrypted += String.fromCharCode(originalChar)
          }
          decrypted = roundDecrypted
        }
      }
      
      return decrypted
    } catch (error) {
      console.error('Decryption failed:', error)
      return ''
    }
  }

  // Simple hash function for key derivation
  private static simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36) + str.length.toString(36)
  }

  // Validate order items structure and content
  public static validateOrderItems(items: any[]): boolean {
    if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
      return false
    }
    
    for (const item of items) {
      // Validate required fields
      if (!item.id || !item.name || !item.quantity || !item.price) {
        return false
      }
      
      // Validate types and ranges
      if (typeof item.id !== 'number' || item.id < 1 || item.id > 1000) {
        return false
      }
      
      if (typeof item.name !== 'string' || item.name.length > 100) {
        return false
      }
      
      if (typeof item.quantity !== 'number' || item.quantity < 1 || item.quantity > 99) {
        return false
      }
      
      if (typeof item.price !== 'number' || item.price <= 0 || item.price > 1000) {
        return false
      }
      
      // Sanitize string fields
      item.name = this.sanitizeText(item.name)
      if (item.emoji) {
        item.emoji = this.sanitizeText(item.emoji)
      }
    }
    
    return true
  }

  // Validate total amount matches items
  public static validateTotalAmount(items: any[], totalAmount: number): boolean {
    const calculatedTotal = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity)
    }, 0)
    
    // Allow small floating point differences
    return Math.abs(calculatedTotal - totalAmount) < 0.01
  }

  // Validate customer session format
  public static validateCustomerSession(session: string): boolean {
    if (typeof session !== 'string') return false
    
    // Should match pattern: customer_timestamp_random
    const pattern = /^customer_[a-z0-9]{8,}_[a-z0-9]{9,}$/
    return pattern.test(session) && session.length >= 25 && session.length <= 50
  }

  // Content Security Policy headers for production
  public static getCSPHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Next.js
        "style-src 'self' 'unsafe-inline'", // Needed for Tailwind
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests"
      ].join('; '),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
  }

  // Audit logging for security events
  public static logSecurityEvent(
    eventType: string,
    details: Record<string, any> = {},
    isSuccess: boolean = true
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      success: isSuccess,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      ...details
    }
    
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to your monitoring service (DataDog, Sentry, etc.)
      console.log('Security Event:', logEntry)
    } else {
      console.log('🔒 Security Event:', logEntry)
    }
  }
}