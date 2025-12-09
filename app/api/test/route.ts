import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    url_value: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...',
    env_check: 'Environment test endpoint working'
  })
}