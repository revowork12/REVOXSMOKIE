// Shared constants for the café application

export interface MenuItem {
  id: number
  name: string
  price: number
  image: string
  variants?: string[]
}

export const MENU_ITEMS: MenuItem[] = [
  { id: 1, name: 'Classic Burger', price: 25, image: '/api/placeholder/300/200', variants: ['Regular (R)', 'Large (L)'] },
  { id: 2, name: 'Smokies Special', price: 35, image: '/api/placeholder/300/200', variants: ['Regular (R)', 'Large (L)'] },
  { id: 3, name: 'BBQ Burger', price: 30, image: '/api/placeholder/300/200', variants: ['Regular (R)', 'Large (L)'] },
  { id: 4, name: 'Cheese Deluxe', price: 40, image: '/api/placeholder/300/200', variants: ['Regular (R)', 'Large (L)'] },
  { id: 5, name: 'Crispy Fries', price: 15, image: '/api/placeholder/300/200', variants: ['Regular (R)', 'Large (L)'] },
  { id: 6, name: 'Milkshake', price: 20, image: '/api/placeholder/300/200', variants: ['Regular (R)', 'Large (L)'] },
  { id: 7, name: 'Chicken Wings', price: 28, image: '/api/placeholder/300/200', variants: ['Regular (R)', 'Large (L)'] },
]

export const COLORS = {
  primary: '#CC2133',
  secondary: '#214194',
  background: '#CC2133',
  // Keep old names for backward compatibility
  navy: '#214194',
  cream: '#CC2133',
} as const

export type Quantities = Record<number, number>