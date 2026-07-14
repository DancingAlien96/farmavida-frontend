"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  Receipt,
  Users,
  Settings,
  Zap,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearSession, getUser } from "@/lib/auth";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Tablero", icon: LayoutDashboard },
  { href: "/dashboard/inventario", label: "Inventario", icon: Package },
  { href: "/dashboard/compras", label: "Compras", icon: ShoppingBag },
  { href: "/dashboard/pos", label: "Punto de Venta", icon: ShoppingCart },
  { href: "/dashboard/ventas", label: "Ventas", icon: Receipt },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  // Solo el ADMIN ve Configuración (incluye la gestión de usuarios)
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings, adminOnly: true },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(getUser()?.rol === "ADMIN");
  }, []);

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  function handleLogout() {
    clearSession();
    onClose?.();
    router.push("/login");
  }

  return (
    <aside className="flex flex-col w-64 lg:w-56 h-full min-h-screen bg-[#1e3a5f] text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-white/10">
        {/* Fondo blanco para que el logo (texto azul oscuro) resalte sobre el sidebar */}
        <div className="flex-1 bg-white rounded-lg px-3 py-2 shadow-sm">
          <Image
            src="/logo-fv.png"
            alt="FarmaVida"
            width={140}
            height={56}
            className="object-contain"
            style={{ width: "100%", height: "auto" }}
            priority
          />
        </div>
        {/* Botón cerrar solo en móvil */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-white/60 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-2",
                active
                  ? "bg-[#29abe2]/20 text-white border-l-[#29abe2]"
                  : "text-white/65 hover:bg-white/8 hover:text-white border-l-transparent"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#29abe2]" : "")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Acciones inferiores */}
      <div className="px-3 pb-5 space-y-2 border-t border-white/10 pt-4">
        {/* Nueva Venta rápida */}
        <button className="w-full flex items-center justify-center gap-2 bg-[#29abe2] hover:bg-[#1e9ad0] transition-colors rounded-lg px-3 py-2.5 text-sm font-semibold text-white shadow-sm">
          <Zap className="h-4 w-4" />
          Nueva Venta
        </button>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/65 hover:bg-red-500/15 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
