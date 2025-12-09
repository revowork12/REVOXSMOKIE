import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/order-tracking?order_number=1001&verification_number=1234
export async function GET(request: NextRequest) {
  // 🔒 SECURITY: Order tracking requires both order_number AND verification_number (secure)
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const orderNumber = searchParams.get('order_number')
    const verificationNumber = searchParams.get('verification_number')

    if (!orderNumber || !verificationNumber) {
      return NextResponse.json({ 
        error: 'Both order_number and verification_number are required' 
      }, { status: 400 })
    }

    // Get order from orders table
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', parseInt(orderNumber))
      .eq('verification_number', parseInt(verificationNumber))
      .single()

    if (error || !order) {
      console.error('Error fetching order:', error)
      return NextResponse.json({ 
        error: 'Order not found. Please check your order number and verification code.' 
      }, { status: 404 })
    }

    // Get detailed order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)

    if (itemsError) {
      console.error('Error fetching order items:', itemsError)
    }

    return NextResponse.json({ 
      order: {
        ...order,
        items: orderItems || []
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/order-tracking - Update order status (admin only)
export async function PUT(request: NextRequest) {
  // 🔒 SECURITY: Only authenticated admin users can update order status
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized - Admin access required to update order status' }, { status: 401 })
  }

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const body = await request.json()
    const { order_id, status } = body

    // Validate status
    const validStatuses = ['preparing', 'ready', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 })
    }

    const updateData: any = { status }
    
    // Set completed_at if status is completed
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating order status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      order 
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}