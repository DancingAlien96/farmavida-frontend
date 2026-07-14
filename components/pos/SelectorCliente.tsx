"use client";

import { useState } from "react";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  User,
  UserPlus,
  Search,
  Loader2,
  X,
  ArrowLeft,
  Users,
} from "lucide-react";

export interface ClienteLite {
  id: number;
  nombres: string;
  apellidos: string;
  dpi: string | null;
  nit: string | null;
  telefono: string | null;
}

interface Props {
  cliente: ClienteLite | null;
  onCambiar: (c: ClienteLite | null) => void;
}

const FORM_VACIO = { nombres: "", apellidos: "", dpi: "", nit: "", telefono: "" };

export function SelectorCliente({ cliente, onCambiar }: Props) {
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState<"lista" | "nuevo">("lista");

  const [clientes, setClientes] = useState<ClienteLite[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clientes`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      setClientes([]);
    } finally {
      setCargando(false);
    }
  }

  function abrir() {
    setOpen(true);
    setModo("lista");
    setBusqueda("");
    setError("");
    setForm(FORM_VACIO);
    cargar();
  }

  const filtrados =
    busqueda.trim().length === 0
      ? clientes.slice(0, 8)
      : clientes
          .filter(
            (c) =>
              `${c.nombres} ${c.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()) ||
              (c.dpi ?? "").includes(busqueda) ||
              (c.nit ?? "").includes(busqueda) ||
              (c.telefono ?? "").includes(busqueda)
          )
          .slice(0, 12);

  function seleccionar(c: ClienteLite | null) {
    onCambiar(c);
    setOpen(false);
  }

  async function crearCliente() {
    setError("");
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      setError("Nombres y apellidos son obligatorios.");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clientes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          dpi: form.dpi.trim() || null,
          nit: form.nit.trim() || null,
          telefono: form.telefono.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo registrar el cliente.");
        return;
      }
      const c = data.cliente as ClienteLite;
      // Selecciona automáticamente al cliente recién creado y cierra
      seleccionar({
        id: c.id,
        nombres: c.nombres,
        apellidos: c.apellidos,
        dpi: c.dpi,
        nit: c.nit,
        telefono: c.telefono,
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-[#1e3a5f]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 leading-tight">Cliente</p>
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
              {cliente ? `${cliente.nombres} ${cliente.apellidos}` : "Consumidor final"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {cliente && (
            <button
              onClick={() => onCambiar(null)}
              title="Quitar cliente"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Button variant="outline" size="sm" onClick={abrir}>
            {cliente ? "Cambiar" : "Asignar"}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {modo === "lista" ? (
            <>
              <DialogHeader className="pb-2 border-b border-gray-100">
                <DialogTitle className="text-[#1e3a5f]">Asignar cliente</DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    autoFocus
                    className="pl-9"
                    placeholder="Buscar por nombre, DNI o teléfono..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>

                {/* Acciones rápidas */}
                <div className="flex gap-2">
                  <button
                    onClick={() => seleccionar(null)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    Consumidor final
                  </button>
                  <button
                    onClick={() => {
                      setModo("nuevo");
                      setError("");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#29abe2] bg-[#29abe2]/10 px-3 py-2 text-sm font-semibold text-[#1e3a5f] hover:bg-[#29abe2]/20 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    Nuevo cliente
                  </button>
                </div>

                {/* Lista de clientes */}
                <div className="max-h-64 overflow-y-auto -mx-1 px-1">
                  {cargando ? (
                    <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Cargando...</span>
                    </div>
                  ) : filtrados.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-400">
                      {busqueda.trim()
                        ? "Sin coincidencias. Puedes registrarlo como nuevo cliente."
                        : "No hay clientes registrados todavía."}
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-50">
                      {filtrados.map((c) => (
                        <li key={c.id}>
                          <button
                            onClick={() => seleccionar(c)}
                            className="w-full text-left px-2 py-2.5 rounded-lg hover:bg-[#1e3a5f]/5 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-900">
                              {c.nombres} {c.apellidos}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {[c.dpi && `DPI: ${c.dpi}`, c.nit && `NIT: ${c.nit}`, c.telefono && `Tel: ${c.telefono}`]
                                .filter(Boolean)
                                .join(" · ") || "Sin datos de contacto"}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="pb-2 border-b border-gray-100">
                <DialogTitle className="text-[#1e3a5f] flex items-center gap-2">
                  <button
                    onClick={() => {
                      setModo("lista");
                      setError("");
                    }}
                    className="p-1 -ml-1 text-gray-400 hover:text-gray-700 rounded-md"
                    title="Volver"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  Nuevo cliente
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nombres *</label>
                    <Input
                      autoFocus
                      value={form.nombres}
                      onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                      placeholder="Ej: María"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Apellidos *</label>
                    <Input
                      value={form.apellidos}
                      onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                      placeholder="Ej: González"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">DPI</label>
                    <Input
                      value={form.dpi}
                      onChange={(e) => setForm({ ...form, dpi: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">NIT</label>
                    <Input
                      value={form.nit}
                      onChange={(e) => setForm({ ...form, nit: e.target.value })}
                      placeholder="Para factura"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Teléfono</label>
                    <Input
                      value={form.telefono}
                      onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setModo("lista")} disabled={guardando}>
                  Cancelar
                </Button>
                <Button
                  onClick={crearCliente}
                  disabled={guardando}
                  className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white gap-2"
                >
                  {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Registrar y asignar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
