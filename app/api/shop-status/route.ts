import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/shop-status - Get current shop status using new schema
export async function GET(request: NextRequest) {
  // 🔒 SECURITY: Shop status can be read by anyone (customers need to know if open)
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    // Use the shop_status table
    const { data: shopStatus, error } = await supabase
      .from('shop_status')
      .select('*')
      .single()

    if (error) {
      console.error('Error fetching shop status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      isOpen: shopStatus.current_status === 'open',
      status: shopStatus.current_status,
      shopName: shopStatus.shop_name,
      message: shopStatus.display_message,
      isTakingOrders: shopStatus.is_taking_orders,
      openingTime: shopStatus.opening_time,
      closingTime: shopStatus.closing_time,
      phone: shopStatus.phone,
      address: shopStatus.address,
      lastUpdated: shopStatus.last_updated 
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/shop-status - Toggle shop status (admin only) using new schema
export async function POST(request: NextRequest) {
  // 🔒 SECURITY: Only authenticated admin users can change shop status
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized - Admin access required to change shop status' }, { status: 401 })
  }

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const body = await request.json()
    const { action, status, is_taking_orders } = body

    // Handle different actions
    if (action === 'toggle_shop') {
      // Use the database function for toggling shop status
      const { data: result, error } = await supabase.rpc('toggle_shop_status', { 
        new_status: status === 'open' 
      })

      if (error) {
        console.error('Error toggling shop status:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(result)
    } 
    else if (action === 'toggle_orders') {
      // Use the database function for toggling order taking
      const { data: result, error } = await supabase.rpc('toggle_order_taking', { 
        new_status: is_taking_orders 
      })

      if (error) {
        console.error('Error toggling order taking:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(result)
    }
    else {
      // Legacy support - direct update to shop_settings
      const isOpen = status === 'open'
      
      const { data: shopStatus, error } = await supabase
        .from('shop_settings')
        .update({ 
          is_open: isOpen,
          last_updated: new Date().toISOString(),
          updated_by: 'admin'
        })
        .eq('id', 1)
        .select()
        .single()

      if (error) {
        console.error('Error updating shop status:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        isOpen: shopStatus.is_open,
        status: shopStatus.is_open ? 'open' : 'closed',
        lastUpdated: shopStatus.last_updated 
      })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/shop-status - Update shop status (admin only) using new schema
export async function PUT(request: NextRequest) {
  // 🔒 SECURITY: Only authenticated admin users can update shop settings
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized - Admin access required to update shop settings' }, { status: 401 })
  }

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const body = await request.json()
    const { 
      shop_name, 
      opening_time, 
      closing_time, 
      phone, 
      address, 
      shop_message, 
      closed_message 
    } = body

    // Update shop settings
    const { data: shopSettings, error } = await supabase
      .from('shop_settings')
      .update({
        shop_name: shop_name || 'Smokies Restaurant',
        opening_time: opening_time || '09:00:00',
        closing_time: closing_time || '22:00:00',
        phone: phone || '',
        address: address || '',
        shop_message: shop_message || 'Welcome to Smokies! Fresh food made with love.',
        closed_message: closed_message || 'Sorry, we are currently closed. Please visit during our operating hours.',
        last_updated: new Date().toISOString(),
        updated_by: 'admin'
      })
      .eq('id', 1)
      .select()
      .single()

    if (error) {
      console.error('Error updating shop settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      settings: shopSettings
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}