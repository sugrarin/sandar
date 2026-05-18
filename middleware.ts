import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';

// Custom locale detection with Russian priority
function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language') || '';
  
  // Russian language has priority
  if (acceptLanguage.startsWith('ru')) {
    return 'ru';
  }
  
  // Default to Kazakh
  return 'kk';
}

// Create internationalization middleware with custom locale detection
const intlMiddleware = createIntlMiddleware({
  locales: ['kk', 'ru'],
  defaultLocale: 'kk',
  localePrefix: 'as-needed',
  localeDetection: false // We'll handle it manually
});

export async function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname;
  
  // If pathname doesn't have a locale prefix, redirect with appropriate locale
  if (!pathname.startsWith('/kk') && !pathname.startsWith('/ru')) {
    const locale = getLocale(request);
    const newUrl = new URL(`/${locale}${pathname}`, request.url);
    return NextResponse.redirect(newUrl);
  }

  // Handle internationalization for existing locale prefixes
  const intlResponse = intlMiddleware(request);
  
  // If intl middleware redirected, follow that
  if (intlResponse) {
    return intlResponse;
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value, "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, "", ...options });
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
