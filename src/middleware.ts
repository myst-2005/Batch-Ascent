import { NextRequest, NextResponse } from 'next/server'

// This app has shut down — see src/app/page.tsx for the notice. Every route
// other than the notice itself and its static assets redirects there, so a
// bookmarked dashboard link doesn't reach the old (frozen) data.
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname !== '/') {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.next()
}

export const config = {
  // /api is deliberately excluded — n8n and other webhooks (sales-enroll,
  // n8n/enroll) may still be pointed at this app, and killing those
  // silently would be a worse incident than the UI staying reachable by
  // direct link. Only the pages staff actually open are shut down here.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo-new.png|logo.png|logo.jpg).*)'],
}
