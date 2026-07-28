import { NextResponse, type NextRequest } from "next/server";
import { verifyJwt, type JwtPayload } from "@/lib/auth/jwt";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/reset-password");

  let userPayload: JwtPayload | null = null;

  try {
    const token = request.cookies.get("__session")?.value;
    if (token) {
      userPayload = await verifyJwt(token);
    }
  } catch {
    userPayload = null;
  }

  // 1. Unauthenticated → redirect to login for protected routes
  if (!userPayload) {
    if (!isPublicRoute) {
      const redirectUrl = new URL("/login", request.url);
      if (pathname !== "/") {
        redirectUrl.searchParams.set("redirected_to", pathname);
      }
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete("__session");
      return response;
    }
    return NextResponse.next();
  }

  // 2. Inactive account → force logout
  if (userPayload.status === "inactive") {
    const response = NextResponse.redirect(
      new URL("/login?error=account_disabled", request.url)
    );
    response.cookies.delete("__session");
    return response;
  }

  // 3. Authenticated user on public route → redirect to dashboard
  if (isPublicRoute) {
    if (userPayload.dashboard_access) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 4. Dashboard home — check dashboard_access
  if (pathname === "/" && !userPayload.dashboard_access) {
    return NextResponse.redirect(new URL("/login?error=no_module_access", request.url));
  }

  // 5. Admin panel guard
  if (
    pathname.startsWith("/admin") &&
    !userPayload.user_management_access &&
    userPayload.role !== "super_admin" &&
    userPayload.role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/?error=unauthorized_admin", request.url));
  }

  // 6. Module-level guards (check flags from JWT payload)
  const moduleGuards: Record<string, keyof JwtPayload> = {
    "/materials": "materials_access",
    "/inward": "goods_inward_access",
    "/outward": "goods_outward_access",
    "/reports": "reports_access",
    "/analytics": "analytics_access",
    "/settings": "settings_access",
    "/purchase-orders": "purchase_orders_access",
  };

  for (const [prefix, flag] of Object.entries(moduleGuards)) {
    if (pathname.startsWith(prefix) && !userPayload[flag]) {
      return NextResponse.redirect(new URL("/?error=unauthorized_module", request.url));
    }
  }

  return NextResponse.next();
}
