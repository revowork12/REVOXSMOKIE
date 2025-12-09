import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/menu-items - Get individual menu items (for admin management)
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const base_name = searchParams.get('base_name')
    const size_code = searchParams.get('size_code')

    let query = supabase
      .from('menu_items')
      .select('*')
      .order('base_name', { ascending: true })
      .order('size_code', { ascending: true })
      .order('protein', { ascending: true })

    // Filter by base_name if provided
    if (base_name) {
      query = query.eq('base_name', base_name)
    }

    // Filter by size_code if provided
    if (size_code) {
      query = query.eq('size_code', size_code)
    }

    const { data: menuItems, error } = await query

    if (error) {
      console.error('Error fetching menu items:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      menuItems: menuItems || [],
      totalItems: menuItems?.length || 0
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/menu-items - Create individual menu item variant
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const body = await request.json()
    const { base_name, size_code, protein, price, description, is_available = true } = body

    // Validate required fields
    if (!base_name || !protein || !price) {
      return NextResponse.json({ 
        error: 'base_name, protein, and price are required' 
      }, { status: 400 })
    }

    // Insert new menu item variant
    const { data: menuItem, error } = await supabase
      .from('menu_items')
      .insert([{
        base_name,
        size_code: size_code || '',
        protein,
        price: parseFloat(price),
        description: description || `${size_code ? (size_code === 'R' ? 'Regular' : 'Large') + ' ' : ''}${base_name} with ${protein}`,
        is_available,
        image_url: '/photo_5890062852490464111_y1.jpg'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating menu item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      menuItem 
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/menu-items - Update individual menu item variant
export async function PUT(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const body = await request.json()
    const { id, price, is_available, description, stock_quantity } = body

    if (!id) {
      return NextResponse.json({ 
        error: 'Menu item id is required' 
      }, { status: 400 })
    }

    const updateData: any = {}
    
    if (price !== undefined) updateData.price = parseFloat(price)
    if (is_available !== undefined) updateData.is_available = is_available
    if (description !== undefined) updateData.description = description
    if (stock_quantity !== undefined) updateData.stock_quantity = parseInt(stock_quantity)

    const { data: menuItem, error } = await supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating menu item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      menuItem 
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/menu-items - Delete individual menu item variant
export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ 
        error: 'Menu item id is required' 
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', parseInt(id))

    if (error) {
      console.error('Error deleting menu item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Menu item deleted successfully'
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}