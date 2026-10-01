import { NextResponse } from 'next/server'
import { createServer } from '@/lib/supabaseServer'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/reset-password'

  if (code) {
    const supabase = await createServer()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Prevent open redirect by ensuring `next` is an internal path
      const isInternal = next.startsWith('/') && !next.startsWith('//')
      const redirectUrl = isInternal ? `${origin}${next}` : `${origin}/reset-password`
      return NextResponse.redirect(redirectUrl)
    }
  }

  // return the user to login with an error
  return NextResponse.redirect(`${origin}/login?error=invalid_recovery_link`)
}
