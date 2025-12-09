import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/menu/variants - Add a variant to global variant_options table
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const { variant_name } = await request.json()

    if (!variant_name) {
      return NextResponse.json({ error: 'Missing variant_name' }, { status: 400 })
    }

    // Check if variant already exists
    const { data: existingVariant, error: checkError } = await supabase
      .from('variant_options')
      .select('id')
      .eq('option_name', variant_name.trim())
      .single()

    if (existingVariant) {
      return NextResponse.json({ error: 'Variant already exists' }, { status: 400 })
    }

    // Get the next display_order
    const { data: maxOrder } = await supabase
      .from('variant_options')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrder?.display_order || 0) + 1

    // Add new variant to global list
    const { error } = await supabase
      .from('variant_options')
      .insert({
        option_name: variant_name.trim(),
        is_active: true,
        display_order: nextOrder
      })

    if (error) {
      console.error('Error adding variant:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Variant added to global list successfully' })
    
  } catch (error) {
    console.error('Variant API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/menu/variants - Remove a variant from global variant_options table
export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const url = new URL(request.url)
    const variant_name = url.searchParams.get('variant_name')

    if (!variant_name) {
      return NextResponse.json({ error: 'Missing variant_name' }, { status: 400 })
    }

    // Delete variant from global list
    const { error } = await supabase
      .from('variant_options')
      .delete()
      .eq('option_name', variant_name)

    if (error) {
      console.error('Error removing variant:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Variant removed from global list successfully' })
    
  } catch (error) {
    console.error('Variant delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}