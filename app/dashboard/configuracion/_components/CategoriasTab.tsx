"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
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
import { Tag, Search, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface Categoria {
  id: number;
  nombre: string;
  parentId: number | null;
  parent: { id: number; nombre: string } | null;
  productosCount: number;
  hijosCount: number;
}

interface FormData {
  nombre: string;
  parentId: string; // "" = sin padre
}

const EMPTY_FORM: FormData = { nombre: "", parentId: "" };

export default function CategoriasTab() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function cargar() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categorias`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        setCategorias([]);
        return;
      }
      const data = await res.json();
      setCategorias(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtradas = categorias.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.parent?.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  function abrirCrear() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }

  function abrirEditar(c: Categoria) {
    setEditando(c);
    setForm({ nombre: c.nombre, parentId: c.parentId ? String(c.parentId) : "" });
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
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/categorias/${editando.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/categorias`;
      const method = editando ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          nombre: form.nombre,
          parentId: form.parentId ? Number(form.parentId) : null,
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

  async function eliminar(c: Categoria) {
    const ok = await confirmar({
      titulo: "Eliminar categoría",
      mensaje: `¿Eliminar la categoría "${c.nombre}"?`,
      textoConfirmar: "Eliminar",
      peligro: true,
    });
    if (!ok) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categorias/${c.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "No se pudo eliminar.", "error");
      return;
    }
    toast("Categoría eliminada");
    cargar();
  }

  // Opciones para el selector de padre (excluir al editando y sus descendientes simples)
  const opcionesPadre = categorias.filter((c) => !editando || c.id !== editando.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={abrirCrear}
          className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva Categoría
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Categorías ({categorias.length})
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o padre..."
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
              <span className="text-sm">Cargando categorías...</span>
            </div>
          ) : filtradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Tag className="h-10 w-10 mb-2" />
              <p className="text-sm">No se encontraron categorías</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Nombre</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Categoría padre</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Subcategorías</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Productos</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((c) => (
                    <TableRow key={c.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium text-gray-900 text-sm">{c.nombre}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {c.parent
                          ? <span className="text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full font-medium">{c.parent.nombre}</span>
                          : <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">{c.hijosCount}</TableCell>
                      <TableCell className="text-center text-sm text-gray-600">{c.productosCount}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-[#1e3a5f]">
              {editando ? "Editar categoría" : "Nueva categoría"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nombre *</label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Analgésicos"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Categoría padre</label>
              <select
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#29abe2]/40 focus:border-[#29abe2]"
              >
                <option value="">— Sin padre (categoría raíz) —</option>
                {opcionesPadre.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
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
              {editando ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
