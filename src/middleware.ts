import { NextRequest, NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function middleware(_request: NextRequest) {
  // For session-token based auth, we don't need Supabase Auth middleware
  // Session validation happens in the API routes and components
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}