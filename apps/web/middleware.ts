import { NextResponse, type NextRequest } from "next/server";
import { CSRF_COOKIE } from "@ai-base/auth/constants";
import { createCsrfTokenEdge } from "@ai-base/auth/csrf-edge";
import {
  isAdminDevBypassEnabled,
  isProductionRuntime,
} from "@ai-base/auth/env";

/**
 * Protects /admin UI routes.
 * Edge-safe: no Node crypto / Prisma imports.
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
    response.cookies.set(CSRF_COOKIE, createCsrfTokenEdge(), {
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
