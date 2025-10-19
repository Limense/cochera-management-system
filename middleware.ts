import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req: request, res })
  
  // Get the pathname
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/', '/api']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession()

  // If no session and trying to access protected route
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If has session and trying to access login page, redirect to dashboard
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // For admin-only routes, check role
  if (session && pathname.startsWith('/dashboard/configuracion')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', session.user.id)
      .single()

    if (!profile?.is_active || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return res
}

// Ensure the middleware is only called for relevant paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}