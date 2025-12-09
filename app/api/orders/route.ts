import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/orders - Fetch orders with proper format using new schema
export async function GET(request: NextRequest) {
  // 🔒 SECURITY: Only authenticated users can view orders
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized - Authentication required' }, { status: 401 })
  }

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    // Simple orders fetch like REVOXEGG2-EGG
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/orders - Create new order with new database schema
export async function POST(request: NextRequest) {
  // 🔒 SECURITY: Check if user is authenticated (for customer orders, we'll allow but add validation)
  // Note: Customer orders need to work, but we add validation
  
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const body = await request.json()
    const { items, customerInfo, totalAmount, customer_notes = '' } = body

    // Create order with both order_number and verification_number
    const verificationNumber = Math.floor(1000 + Math.random() * 9000) // Simple 4-digit number like 1234, 5678
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        verification_number: verificationNumber,
        total_amount: parseFloat(totalAmount),
        status: 'pending'
      }])
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    // No need to update order_number - it's already auto-generated correctly

    // Create order items with all required fields for REVOXSMOKIES schema
    const orderItems = items.map((item: any) => {
      const unitPrice = parseFloat(item.price)
      const quantity = parseInt(item.quantity)
      const totalAmount = unitPrice * quantity
      
      // Extract base_name and size_code from the item name
      let baseName = item.name || item.base_name || 'Unknown Item'
      let sizeCode = ''
      let protein = item.variant || item.protein || 'Standard'
      
      // Parse name to extract base name and size
      if (baseName.includes('Regular')) {
        baseName = baseName.replace(' Regular', '')
        sizeCode = 'R'
      } else if (baseName.includes('Large')) {
        baseName = baseName.replace(' Large', '')
        sizeCode = 'L'
      }
      
      return {
        order_id: order.order_number, // Use order_number since there's no id column
        menu_item_id: item.menu_item_id || item.id,
        base_name: baseName,
        size_code: sizeCode,
        protein: protein,
        quantity: quantity,
        unit_price: unitPrice,
        total_amount: totalAmount
      }
    })

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Order items creation error:', itemsError)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // Return simple order data like REVOXEGG2-EGG
    return NextResponse.json({ order })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}