
import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from '@/lib/supabase/middleware';
 
const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  return await updateSession(request, response);
}
 
export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|auth|.*\\..*).*)']
};
