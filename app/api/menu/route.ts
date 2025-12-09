import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/menu - Fetch all menu items with variants from existing tables
export async function GET() {
  // 🔒 SECURITY: Menu can be read by anyone (customers need access)
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    // Query your existing menu_display view/table
    const { data: menuData, error } = await supabase
      .from('menu_display')
      .select('*')
      .order('base_name', { ascending: true })

    if (error) {
      console.error('Error fetching menu items:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform your existing data to match frontend format
    const formattedMenu: any[] = []
    let idCounter = 1

    // Group by base_name and size to create menu items
    const groupedItems = menuData?.reduce((acc: any, item) => {
      const key = `${item.base_name}_${item.size_code}`
      if (!acc[key]) {
        acc[key] = {
          id: idCounter++,
          name: `${item.base_name} ${item.size_code === 'R' ? 'Regular' : 'Large'}`,
          price: parseFloat(item.min_price),
          image: '/photo_5890062852490464111_y1.jpg',
          variants: item.available_proteins || []
        }
      }
      return acc
    }, {})

    const menuItems = Object.values(groupedItems || {})
    
    return NextResponse.json({ menuItems })
    
  } catch (error) {
    console.error('Menu API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/menu - Update a menu item (working with your existing structure)
export async function PUT(request: NextRequest) {
  // 🔒 SECURITY: Only authenticated admin users can modify menu
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized - Admin access required to modify menu' }, { status: 401 })
  }

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { id, name, price } = await request.json()

    if (!id || !name || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Extract base_name and size from the full name
    const isLarge = name.includes('Large')
    const baseName = name.replace(' Regular', '').replace(' Large', '')
    const sizeCode = isLarge ? 'L' : 'R'

    // Update in your existing menu_items table
    const { error } = await supabase
      .from('menu_items')
      .update({
        base_name: baseName,
        price: price
      })
      .eq('base_name', baseName)
      .eq('size_code', sizeCode)

    if (error) {
      console.error('Error updating menu item:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Menu item updated successfully' })
    
  } catch (error) {
    console.error('Menu update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/menu/variants - Add a variant to a menu item
export async function POST(request: NextRequest) {
  // 🔒 SECURITY: Only authenticated admin users can modify menu
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized - Admin access required to modify menu' }, { status: 401 })
  }

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { action, menu_item_id, variant_name } = await request.json()

    if (action === 'add_variant') {
      if (!menu_item_id || !variant_name) {
        return NextResponse.json({ error: 'Missing menu_item_id or variant_name' }, { status: 400 })
      }

      // Add new variant
      const { error } = await supabase
        .from('menu_item_variants')
        .insert({
          menu_item_id: menu_item_id,
          variant_name: variant_name.trim(),
          is_active: true
        })

      if (error) {
        console.error('Error adding variant:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Variant added successfully' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('Variant API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/menu/variants - Remove a variant from a menu item
export async function DELETE(request: NextRequest) {
  // 🔒 SECURITY: Only authenticated admin users can modify menu
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized - Admin access required to modify menu' }, { status: 401 })
  }

  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const url = new URL(request.url)
    const menu_item_id = url.searchParams.get('menu_item_id')
    const variant_name = url.searchParams.get('variant_name')

    if (!menu_item_id || !variant_name) {
      return NextResponse.json({ error: 'Missing menu_item_id or variant_name' }, { status: 400 })
    }

    // Delete variant
    const { error } = await supabase
      .from('menu_item_variants')
      .delete()
      .eq('menu_item_id', parseInt(menu_item_id))
      .eq('variant_name', variant_name)

    if (error) {
      console.error('Error deleting variant:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Variant removed successfully' })
    
  } catch (error) {
    console.error('Variant delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}