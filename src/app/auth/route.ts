import { createHash, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeEqual(a: string, b: string) {
    // Compare constant-time to reduce timing attacks for short secrets
    const ah = Buffer.from(createHash('sha256').update(a).digest('hex'))
    const bh = Buffer.from(createHash('sha256').update(b).digest('hex'))
    return ah.length === bh.length && timingSafeEqual(ah, bh)
}

export async function POST(req: Request) {
    try {
        const form = await req.formData()
        const password = String(form.get('password') ?? '')
        const redirect = String(form.get('redirect') ?? '/')

        const expected = process.env.SITE_PASSWORD ?? ''

        if (!expected) {
            console.error('SITE_PASSWORD not configured')
            return NextResponse.redirect(new URL('/login?error=1', req.url))
        }

        if (safeEqual(password, expected)) {
            // Mark the user as authenticated
            const cookieStore = await cookies()
            cookieStore.set('site_auth', '1', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                // maxAge: 60 * 60 * 8, // optional: 8 hours
            })

            // Redirect to the original destination or home
            const origin = new URL(req.url).origin
            const redirectUrl = new URL(redirect || '/', origin)
            return NextResponse.redirect(redirectUrl, { status: 303 })
        }

        // On failure, send back to login
        return NextResponse.redirect(new URL('/login?error=1', req.url), { status: 303 })
    } catch (error) {
        console.error('Auth error:', error)
        return NextResponse.redirect(new URL('/login?error=1', req.url), { status: 303 })
    }
}
