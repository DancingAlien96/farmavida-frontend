import { NextRequest, NextResponse } from "next/server";

// Rutas que no requieren autenticación
const PUBLIC_ROUTES = ["/login"];

// El farmacéutico solo puede entrar al Punto de Venta.
// Todo lo demás del panel es exclusivo del ADMIN.
const RUTAS_FARMACEUTICO = ["/dashboard/pos"];
const HOME_FARMACEUTICO = "/dashboard/pos";

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

    if (user.rol === "FARMACEUTICO") {
      const permitida = RUTAS_FARMACEUTICO.some(
        (r) => pathname === r || pathname.startsWith(`${r}/`)
      );
      if (!permitida) {
        return NextResponse.redirect(new URL(HOME_FARMACEUTICO, request.url));
      }
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
