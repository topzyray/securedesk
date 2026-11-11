import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0, isAuth0Configured } from "./lib/auth0";

function safeDeskPath(pathname: string): string {
  if (!pathname.startsWith("/desk") || pathname.startsWith("//") || pathname.includes("\\")) {
    return "/desk";
  }
  return pathname;
}

function redirectPreservingAuth(authResponse: NextResponse, location: URL) {
  const redirect = NextResponse.redirect(location);
  for (const cookie of authResponse.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  authResponse.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (normalized === "x-middleware-next" || normalized === "set-cookie") return;
    redirect.headers.set(key, value);
  });
  return redirect;
}

export async function proxy(request: NextRequest) {
  if (!isAuth0Configured()) {
    if (request.nextUrl.pathname.startsWith("/desk") || request.nextUrl.pathname.startsWith("/auth")) {
      return NextResponse.redirect(new URL("/setup", request.url));
    }
    return NextResponse.next();
  }

  const authResponse = await auth0.middleware(request);

  if (request.nextUrl.pathname.startsWith("/auth")) {
    return authResponse;
  }

  if (request.nextUrl.pathname.startsWith("/desk")) {
    const session = await auth0.getSession(request);
    if (!session) {
      const loginUrl = new URL("/auth/login", request.nextUrl.origin);
      loginUrl.searchParams.set("returnTo", safeDeskPath(request.nextUrl.pathname));
      return redirectPreservingAuth(authResponse, loginUrl);
    }
  }

  return authResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
