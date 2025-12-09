import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  console.log('🛡️ Middleware called for:', req.nextUrl.pathname)
  
  // Temporarily disable middleware for testing
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    console.log('🚨 Dashboard access attempted - temporarily allowing for testing')
    // TODO: Re-enable proper auth check after login is working
    return NextResponse.next()
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
}