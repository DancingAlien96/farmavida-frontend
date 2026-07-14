import { NextRequest, NextResponse } from "next/server";

// Rutas que no requieren autenticación
const PUBLIC_ROUTES = ["/login"];

// Rutas exclusivas para ciertos roles
const ROLE_ROUTES: Record<string, string[]> = {
  "/dashboard/configuracion": ["ADMIN"],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas y assets
  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("fv_token")?.value;
  const userCookie = request.cookies.get("fv_user")?.value;

  // Sin token → redirigir al login
  if (!token || !userCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar restricciones por rol
  try {
    const user = JSON.parse(decodeURIComponent(userCookie));
    const allowedRoles = ROLE_ROUTES[pathname];

    if (allowedRoles && !allowedRoles.includes(user.rol)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch {
    // Cookie corrupta — limpiar y redirigir
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("fv_token");
    response.cookies.delete("fv_user");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-fv.png).*)"],
};
