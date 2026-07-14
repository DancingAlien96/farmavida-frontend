"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Users, FlaskConical, Tag, Truck, ShieldOff } from "lucide-react";
import UsuariosTab from "./_components/UsuariosTab";
import LaboratoriosTab from "./_components/LaboratoriosTab";
import CategoriasTab from "./_components/CategoriasTab";
import ProveedoresTab from "./_components/ProveedoresTab";

type Tab = "usuarios" | "laboratorios" | "categorias" | "proveedores";

const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "laboratorios", label: "Laboratorios", icon: FlaskConical },
  { id: "categorias", label: "Categorías", icon: Tag },
  { id: "proveedores", label: "Proveedores", icon: Truck },
];

export default function ConfiguracionPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("usuarios");

  useEffect(() => {
    const u = getUser();
    setIsAdmin(u?.rol === "ADMIN");
  }, []);

  if (isAdmin === null) return null;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <ShieldOff className="h-12 w-12 mb-3" />
        <p className="text-sm">No tienes permisos para acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Administra usuarios, laboratorios y categorías del sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  active
                    ? "text-[#1e3a5f] border-[#29abe2]"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {tab === "usuarios" && <UsuariosTab />}
      {tab === "laboratorios" && <LaboratoriosTab />}
      {tab === "categorias" && <CategoriasTab />}
      {tab === "proveedores" && <ProveedoresTab />}
    </div>
  );
}
