import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get grouped menu items with available proteins using the view
    const { data: menuGroups, error } = await supabase
      .from('menu_display')
      .select('*')

    if (error) {
      console.error('Error fetching menu:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format for frontend with enhanced information
    const formattedMenu = menuGroups?.map((group: any) => ({
      id: `${group.base_name}-${group.size_code}`,
      base_name: group.base_name,
      size_code: group.size_code,
      display_name: group.size_code ? 
        `${group.size_code === 'R' ? 'Regular' : 'Large'} ${group.base_name}` : 
        group.base_name,
      proteins: group.available_proteins,
      min_price: group.min_price,
      max_price: group.max_price,
      price_range: group.min_price === group.max_price ? 
        group.min_price : 
        `${group.min_price}-${group.max_price}`,
      available: group.all_variants_available,
      category: 'burger',
      image_url: '/photo_5890062852490464111_y1.jpg'
    })) || []

    return NextResponse.json({ 
      success: true,
      menuItems: formattedMenu,
      totalItems: formattedMenu.length
    })
  } catch (error) {
    console.error('Error in menu API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle menu management actions
export async function POST(request: Request) {
  try {
    const { action, ...params } = await request.json()
    
    if (action === 'get_proteins') {
      // Get available protein options for admin
      const { data: proteins, error } = await supabase
        .from('variant_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        proteins 
      })
    }
    
    if (action === 'add_protein') {
      // Add new protein option
      const { option_name } = params
      
      const { data: protein, error } = await supabase
        .from('variant_options')
        .insert([{
          option_name,
          is_active: true,
          display_order: 999 // Will be at the end
        }])
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        protein 
      })
    }
    
    if (action === 'toggle_protein') {
      // Toggle protein active status
      const { protein_id, is_active } = params
      
      const { data: protein, error } = await supabase
        .from('variant_options')
        .update({ is_active })
        .eq('id', protein_id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        protein 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in menu POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}