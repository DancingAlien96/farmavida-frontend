"use client";

import { Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";

interface UserSession {
  email: string;
  rol: string;
}

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [user, setUser] = useState<UserSession | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  // Iniciales del email para el avatar
  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "FV";

  const rolLabel: Record<string, string> = {
    ADMIN: "Administrador",
    FARMACEUTICO: "Farmacéutico",
    CLIENTE: "Cliente",
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0">
      {/* Hamburguesa solo en móvil */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Usuario (empujado a la derecha) */}
      <div className="flex items-center gap-2.5 ml-auto">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-[#1e3a5f] text-white text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-800 leading-tight truncate max-w-[180px]">
            {user?.email ?? "Usuario"}
          </p>
          <p className="text-xs text-gray-500 leading-tight">
            {user ? rolLabel[user.rol] : ""}
          </p>
        </div>
      </div>
    </header>
  );
}
