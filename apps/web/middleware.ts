import { NextResponse, type NextRequest } from "next/server";
import {
  CSRF_COOKIE,
  createCsrfToken,
  isAdminDevBypassEnabled,
  isProductionRuntime,
} from "@ai-base/auth";

/**
 * Protects /admin UI routes.
 * - Production: require session cookie (fail closed until Supabase is wired).
 * - Non-production with ADMIN_DEV_BYPASS: allow + ensure CSRF cookie.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (isProductionRuntime()) {
    const hasSession = Boolean(request.cookies.get("aibase_session")?.value);
    if (!hasSession) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
  } else if (!isAdminDevBypassEnabled()) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const response = NextResponse.next();
  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, createCsrfToken(), {
      path: "/",
      sameSite: "strict",
      secure: isProductionRuntime(),
      httpOnly: false,
      maxAge: 86_400,
    });
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
