import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl

    // Allow these paths without auth:
    const publicPaths = [
        '/login',
        '/auth',            // our Route Handler
        '/favicon.ico',
        '/robots.txt',
        '/sitemap.xml',
    ]
    const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p))

    // Ignore Next.js internals & static assets:
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/assets') ||
        pathname.startsWith('/static') ||
        pathname.startsWith('/api')    // if you have other APIs that shouldn't be gated, remove this
    ) {
        return NextResponse.next()
    }

    const authorized = req.cookies.get('site_auth')?.value === '1'

    if (!authorized && !isPublic) {
        const url = req.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirect', pathname) // optional
        return NextResponse.redirect(url) // redirect unauthenticated users to /login
    }

    return NextResponse.next()
}

// Optionally restrict the matcher; by default middleware runs on all routes.
export const config = {
    matcher: ['/((?!_next).*)'],
}
