"use client";

import { useEffect, useState } from "react";
import { getToken, getUser } from "@/lib/auth";
import { toast } from "@/components/ui/toast";
import { confirmar } from "@/components/ui/confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ShoppingBag,
} from "lucide-react";

interface Cliente {
  id: number;
  nombres: string;
  apellidos: string;
  dpi: string | null;
  nit: string | null;
  telefono: string | null;
  direccion: string | null;
  fechaNacimiento: string | null;
  usuario: { id: number; email: string; activo: boolean; createdAt: string };
  ventasCount: number;
}

interface FormData {
  nombres: string;
  apellidos: string;
  dpi: string;
  nit: string;
  telefono: string;
  direccion: string;
  fechaNacimiento: string;
}

const EMPTY_FORM: FormData = {
  nombres: "",
  apellidos: "",
  dpi: "",
  nit: "",
  telefono: "",
  direccion: "",
  fechaNacimiento: "",
};

export default function ClientesPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // Modal crear / editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const u = getUser();
    setIsAdmin(u?.rol === "ADMIN");
  }, []);

  async function cargar() {
    setLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/clientes`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        setClientes([]);
        return;
      }
      setClientes(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = clientes.filter(
    (c) =>
      `${c.nombres} ${c.apellidos}`.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.dpi ?? "").includes(busqueda) ||
      (c.nit ?? "").includes(busqueda) ||
      (c.telefono ?? "").includes(busqueda)
  );

  function abrirCrear() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }

  function abrirEditar(c: Cliente) {
    setEditando(c);
    setForm({
      nombres: c.nombres,
      apellidos: c.apellidos,
      dpi: c.dpi ?? "",
      nit: c.nit ?? "",
      telefono: c.telefono ?? "",
      direccion: c.direccion ?? "",
      fechaNacimiento: c.fechaNacimiento ? c.fechaNacimiento.slice(0, 10) : "",
    });
    setError("");
    setDialogOpen(true);
  }

  async function guardar() {
    setError("");
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      setError("Nombres y apellidos son obligatorios.");
      return;
    }

    setGuardando(true);
    try {
      const url = editando
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/clientes/${editando.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/clientes`;
      const method = editando ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...form,
          fechaNacimiento: form.fechaNacimiento || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar.");
        return;
      }

      setDialogOpen(false);
      cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(c: Cliente) {
    const ok = await confirmar({
      titulo: "Eliminar cliente",
      mensaje: `Se quitará a "${c.nombres} ${c.apellidos}" de la lista. ¿Continuar?`,
      textoConfirmar: "Eliminar",
      peligro: true,
    });
    if (!ok) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/clientes/${c.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    toast("Cliente eliminado");
    cargar();
  }

  // Stats
  const total = clientes.length;
  const conCompras = clientes.filter((c) => c.ventasCount > 0).length;
  const sinCompras = total - conCompras;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestiona los clientes registrados de la farmacia
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={abrirCrear}
            className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total clientes</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Con compras</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{conCompras}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sin compras</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{sinCompras}</p>
              </div>
              <Users className="h-8 w-8 text-gray-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Clientes ({clientes.length})
            </CardTitle>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, DNI o teléfono..."
                  className="pl-9 h-9 text-sm"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando clientes...</span>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users className="h-10 w-10 mb-2" />
              <p className="text-sm">No se encontraron clientes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Nombre</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">DPI</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">NIT</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Teléfono</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Dirección</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Compras</TableHead>
                    {isAdmin && (
                      <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Acciones</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((c) => (
                    <TableRow key={c.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <p className="font-medium text-gray-900 text-sm">
                          {c.nombres} {c.apellidos}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {c.dpi ?? <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {c.nit ?? <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {c.telefono ?? <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                        {c.direccion ?? <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">{c.ventasCount}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Editar"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                              onClick={() => abrirEditar(c)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Eliminar"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => eliminar(c)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal crear / editar */}
      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader className="pb-2 border-b border-gray-100">
              <DialogTitle className="text-[#1e3a5f]">
                {editando ? "Editar cliente" : "Nuevo cliente"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nombres *</label>
                  <Input
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
                    placeholder="Ej: González López"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">DPI</label>
                  <Input
                    value={form.dpi}
                    onChange={(e) => setForm({ ...form, dpi: e.target.value })}
                    placeholder="Documento personal (opcional)"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">NIT</label>
                  <Input
                    value={form.nit}
                    onChange={(e) => setForm({ ...form, nit: e.target.value })}
                    placeholder="Para factura (opcional)"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Teléfono</label>
                <Input
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Dirección</label>
                <Input
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Fecha de nacimiento</label>
                <Input
                  type="date"
                  value={form.fechaNacimiento}
                  onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={guardando}>
                Cancelar
              </Button>
              <Button
                onClick={guardar}
                disabled={guardando}
                className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white"
              >
                {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editando ? "Guardar cambios" : "Crear cliente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
