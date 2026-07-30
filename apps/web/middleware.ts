import { NextResponse, type NextRequest } from "next/server";
import { CSRF_COOKIE, USER_SESSION_COOKIE } from "@ai-base/auth/constants";
import { createCsrfTokenEdge } from "@ai-base/auth/csrf-edge";
import {
  isAdminDevBypassEnabled,
  isProductionRuntime,
} from "@ai-base/auth/env";

/**
 * /admin → customer user session
 * /ops → ops secret session
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/ops")) {
    if (pathname.startsWith("/ops/login")) {
      return NextResponse.next();
    }
    const hasOps = Boolean(request.cookies.get("aibase_session")?.value);
    if (isProductionRuntime()) {
      if (!hasOps) {
        const login = new URL("/ops/login", request.url);
        login.searchParams.set("next", pathname);
        return NextResponse.redirect(login);
      }
    } else if (!isAdminDevBypassEnabled() && !hasOps) {
      const login = new URL("/ops/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    return withCsrf(NextResponse.next(), request);
  }

  if (pathname.startsWith("/admin")) {
    const hasUser = Boolean(request.cookies.get(USER_SESSION_COOKIE)?.value);
    if (!hasUser) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    return withCsrf(NextResponse.next(), request);
  }

  return NextResponse.next();
}

function withCsrf(response: NextResponse, request: NextRequest) {
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
  matcher: ["/admin/:path*", "/ops/:path*"],
};
