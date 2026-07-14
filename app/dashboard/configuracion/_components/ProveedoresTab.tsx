"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
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
import { Truck, Search, Plus, Pencil, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Proveedor {
  id: number;
  nombre: string;
  ruc: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  comprasCount: number;
}

interface FormData {
  nombre: string;
  ruc: string;
  contacto: string;
  telefono: string;
  email: string;
  activo: boolean;
}

const EMPTY_FORM: FormData = {
  nombre: "",
  ruc: "",
  contacto: "",
  telefono: "",
  email: "",
  activo: true,
};

export default function ProveedoresTab() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function cargar() {
    setLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/proveedores${verInactivos ? "?incluirInactivos=true" : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        setProveedores([]);
        return;
      }
      setProveedores(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verInactivos]);

  const filtrados = proveedores.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.ruc ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.contacto ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  function abrirCrear() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }

  function abrirEditar(p: Proveedor) {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      ruc: p.ruc ?? "",
      contacto: p.contacto ?? "",
      telefono: p.telefono ?? "",
      email: p.email ?? "",
      activo: p.activo,
    });
    setError("");
    setDialogOpen(true);
  }

  async function guardar() {
    setError("");
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setGuardando(true);
    try {
      const url = editando
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/proveedores/${editando.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/proveedores`;
      const method = editando ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
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

  async function desactivar(p: Proveedor) {
    if (!confirm(`¿Desactivar el proveedor "${p.nombre}"?`)) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/proveedores/${p.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    cargar();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={verInactivos}
            onChange={(e) => setVerInactivos(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Ver inactivos
        </label>
        <Button
          onClick={abrirCrear}
          className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Proveedores ({proveedores.length})
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, RUC o contacto..."
                className="pl-9 h-9 text-sm"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando proveedores...</span>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Truck className="h-10 w-10 mb-2" />
              <p className="text-sm">No se encontraron proveedores</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Nombre</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">RUC</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Contacto</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Teléfono</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Compras</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((p) => (
                    <TableRow key={p.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <p className="font-medium text-gray-900 text-sm">{p.nombre}</p>
                        {p.email && <p className="text-xs text-gray-400 mt-0.5">{p.email}</p>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {p.ruc ?? <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {p.contacto ?? <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {p.telefono ?? <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        {p.comprasCount}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${p.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {p.activo ? (
                            <><CheckCircle2 className="h-3 w-3" /> Activo</>
                          ) : (
                            <><XCircle className="h-3 w-3" /> Inactivo</>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Editar"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                            onClick={() => abrirEditar(p)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {p.activo && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Desactivar"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => desactivar(p)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-[#1e3a5f]">
              {editando ? "Editar proveedor" : "Nuevo proveedor"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nombre *</label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Distribuidora Farma SA"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">RUC</label>
                <Input
                  value={form.ruc}
                  onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Teléfono</label>
                <Input
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Persona de contacto</label>
              <Input
                value={form.contacto}
                onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Opcional"
              />
            </div>

            {editando && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="prov-activo"
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="prov-activo" className="text-sm text-gray-700">
                  Proveedor activo
                </label>
              </div>
            )}

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
              {editando ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
