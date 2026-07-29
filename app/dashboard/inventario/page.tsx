"use client";

import { useEffect, useState } from "react";
import { getToken, getUser } from "@/lib/auth";
import { toast } from "@/components/ui/toast";
import { confirmar } from "@/components/ui/confirm";
import { Badge } from "@/components/ui/badge";
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
  Package,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  Loader2,
  ImageIcon,
  Upload,
  X,
  Eye,
} from "lucide-react";

// Redimensiona y comprime una imagen a un data URL JPEG pequeño (~30-40 KB),
// apto para guardarse en la base de datos y mostrarse como miniatura.
function comprimirImagen(file: File, max = 400, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > max) {
          height = Math.round((height * max) / width);
          width = max;
        } else if (height >= width && height > max) {
          width = Math.round((width * max) / height);
          height = max;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No se pudo procesar la imagen"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Imagen inválida"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export interface UnidadVenta {
  id: number;
  nombre: string;
  equivale: number;
  precio: string;
}

interface Producto {
  id: number;
  nombre: string;
  codigoBarras: string | null;
  presentacion: string | null;
  concentracion: string | null;
  unidadBase: string;
  precioVenta: string;
  stockMinimo: number;
  descripcion: string | null;
  imagen: string | null;
  requiereReceta: boolean;
  stock: number;
  fechaVencimiento: string | null;
  categoria: { id: number; nombre: string } | null;
  laboratorio: { id: number; nombre: string } | null;
  unidadesVenta: UnidadVenta[];
}

// Fila editable de "forma de venta" en el formulario
interface UnidadForm {
  nombre: string;
  equivale: string;
  precio: string;
}

interface FormData {
  nombre: string;
  codigoBarras: string;
  presentacion: string;
  concentracion: string;
  unidadBase: string;
  precioVenta: string;
  stockMinimo: string;
  requiereReceta: boolean;
  descripcion: string;
  imagen: string;
  categoriaId: string;
  laboratorioId: string;
  unidades: UnidadForm[];
}

const EMPTY_FORM: FormData = {
  nombre: "",
  codigoBarras: "",
  presentacion: "",
  concentracion: "",
  descripcion: "",
  imagen: "",
  unidadBase: "Unidad",
  precioVenta: "",
  stockMinimo: "5",
  requiereReceta: false,
  categoriaId: "",
  laboratorioId: "",
  unidades: [],
};

function estadoStock(stock: number, minimo: number) {
  if (stock === 0) return { label: "Sin stock", color: "bg-red-100 text-red-700", icon: XCircle };
  if (stock <= minimo) return { label: "Stock bajo", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle };
  return { label: "En stock", color: "bg-green-100 text-green-700", icon: CheckCircle2 };
}

// Fila etiqueta/valor para el modal de detalle
function Dato({ label, valor, destacado }: { label: string; valor: string; destacado?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-0.5 ${destacado ? "text-base font-bold text-[#1e3a5f]" : "text-sm font-medium text-gray-800"}`}>
        {valor}
      </p>
    </div>
  );
}

interface Catalogo { id: number; nombre: string; }
interface CategoriaItem { id: number; nombre: string; parentId: number | null; }

// Aplana el árbol de categorías a una lista plana indentada (raíz → sus hijos → siguiente raíz...).
// `depth` se usa para renderizar la sangría visual en el <option>.
function ordenarJerarquia(cats: CategoriaItem[]) {
  const raices = cats
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const resultado: { id: number; nombre: string; depth: number }[] = [];
  for (const raiz of raices) {
    resultado.push({ id: raiz.id, nombre: raiz.nombre, depth: 0 });
    const hijos = cats
      .filter((c) => c.parentId === raiz.id)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
    for (const hijo of hijos) {
      resultado.push({ id: hijo.id, nombre: hijo.nombre, depth: 1 });
    }
  }
  return resultado;
}

export default function InventarioPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalle, setDetalle] = useState<Producto | null>(null);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [guardando, setGuardando] = useState(false);
  const [procesandoImg, setProcesandoImg] = useState(false);
  const [error, setError] = useState("");
  const [categorias, setCategorias] = useState<CategoriaItem[]>([]);
  const [laboratorios, setLaboratorios] = useState<Catalogo[]>([]);

  const categoriasArbol = ordenarJerarquia(categorias);

  useEffect(() => {
    const u = getUser();
    setIsAdmin(u?.rol === "ADMIN");
  }, []);

  async function cargarProductos() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/productos`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setProductos(data);
    } catch {
      setError("No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarProductos();
    // Cargar catálogos para los selectores del formulario
    const headers = { Authorization: `Bearer ${getToken()}` };
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categorias`, { headers }).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/laboratorios`, { headers }).then((r) => r.json()),
    ]).then(([cats, labs]) => {
      setCategorias(cats);
      setLaboratorios(labs);
    });
  }, []);

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.categoria?.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.codigoBarras ?? "").includes(busqueda)
  );

  function abrirCrear() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }

  function abrirEditar(p: Producto) {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      codigoBarras: p.codigoBarras ?? "",
      presentacion: p.presentacion ?? "",
      concentracion: p.concentracion ?? "",
      descripcion: p.descripcion ?? "",
      imagen: p.imagen ?? "",
      unidadBase: p.unidadBase || "Unidad",
      precioVenta: p.precioVenta,
      stockMinimo: String(p.stockMinimo),
      requiereReceta: p.requiereReceta,
      categoriaId: p.categoria ? String(p.categoria.id) : "",
      laboratorioId: p.laboratorio ? String(p.laboratorio.id) : "",
      unidades: (p.unidadesVenta ?? []).map((u) => ({
        nombre: u.nombre,
        equivale: String(u.equivale),
        precio: u.precio,
      })),
    });
    setError("");
    setDialogOpen(true);
  }

  // ─── Formas de venta (Blíster, Caja...) ───────────────────────────────────
  function agregarUnidad() {
    setForm((f) => ({ ...f, unidades: [...f.unidades, { nombre: "", equivale: "", precio: "" }] }));
  }
  function quitarUnidad(idx: number) {
    setForm((f) => ({ ...f, unidades: f.unidades.filter((_, i) => i !== idx) }));
  }
  function actualizarUnidad(idx: number, campo: keyof UnidadForm, valor: string) {
    setForm((f) => ({
      ...f,
      unidades: f.unidades.map((u, i) => (i === idx ? { ...u, [campo]: valor } : u)),
    }));
  }

  async function handleImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen.");
      return;
    }
    setProcesandoImg(true);
    setError("");
    try {
      const dataUrl = await comprimirImagen(file);
      setForm((f) => ({ ...f, imagen: dataUrl }));
    } catch {
      setError("No se pudo procesar la imagen. Prueba con otra.");
    } finally {
      setProcesandoImg(false);
    }
  }

  async function guardar() {
    if (!form.nombre || !form.precioVenta) {
      setError("El nombre y el precio de venta son obligatorios.");
      return;
    }

    // Validar las formas de venta antes de enviar
    for (const u of form.unidades) {
      if (!u.nombre.trim()) {
        setError("Cada forma de venta necesita un nombre (ej. Blíster).");
        return;
      }
      const eq = parseInt(u.equivale);
      if (!Number.isInteger(eq) || eq < 2) {
        setError(
          `"${u.nombre}": debe equivaler a 2 o más ${form.unidadBase.toLowerCase()}s. Si equivale a 1, ya es la unidad base.`
        );
        return;
      }
      if (u.precio === "" || parseFloat(u.precio) < 0) {
        setError(`"${u.nombre}": falta el precio.`);
        return;
      }
    }

    setGuardando(true);
    setError("");
    try {
      const url = editando
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/productos/${editando.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/productos`;
      const method = editando ? "PUT" : "POST";

      const { unidades, ...resto } = form;
      const payload: Record<string, unknown> = {
        ...resto,
        unidadBase: form.unidadBase.trim() || "Unidad",
        precioVenta: parseFloat(form.precioVenta),
        stockMinimo: parseInt(form.stockMinimo),
        categoriaId: form.categoriaId ? parseInt(form.categoriaId) : null,
        laboratorioId: form.laboratorioId ? parseInt(form.laboratorioId) : null,
        unidadesVenta: unidades.map((u) => ({
          nombre: u.nombre.trim(),
          equivale: parseInt(u.equivale),
          precio: parseFloat(u.precio),
        })),
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al guardar.");
        return;
      }

      setDialogOpen(false);
      cargarProductos();
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id: number) {
    const ok = await confirmar({
      titulo: "Eliminar producto",
      mensaje: "El producto se quitará del inventario. ¿Continuar?",
      textoConfirmar: "Eliminar",
      peligro: true,
    });
    if (!ok) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/productos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    toast("Producto eliminado");
    cargarProductos();
  }

  // Stats rápidas
  const sinStock = productos.filter((p) => p.stock === 0).length;
  const stockBajo = productos.filter((p) => p.stock > 0 && p.stock <= p.stockMinimo).length;
  const enStock = productos.filter((p) => p.stock > p.stockMinimo).length;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {productos.length} productos registrados
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={abrirCrear}
            className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Button>
        )}
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">En stock</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{enStock}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock bajo</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{stockBajo}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sin stock</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{sinStock}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base font-semibold">Productos</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, código o categoría..."
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
              <span className="text-sm">Cargando inventario...</span>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Package className="h-10 w-10 mb-2" />
              <p className="text-sm">No se encontraron productos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Producto</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Categoría</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Precio</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Stock</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Vencimiento</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosFiltrados.map((p) => {
                    const estado = estadoStock(p.stock, p.stockMinimo);
                    const IconEstado = estado.icon;
                    return (
                      <TableRow key={p.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-md border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center">
                              {p.imagen ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.imagen} alt={p.nombre} className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-4 w-4 text-gray-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 text-sm">{p.nombre}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {[p.presentacion, p.concentracion].filter(Boolean).join(" · ")}
                                {p.requiereReceta && (
                                  <span className="ml-2 text-purple-600 font-medium">Receta</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {p.categoria ? (
                            <span className="text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full font-medium">
                              {p.categoria.nombre}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">Sin categoría</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-gray-900 text-sm">
                          Q {parseFloat(p.precioVenta).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold text-sm ${p.stock === 0 ? "text-red-600" : p.stock <= p.stockMinimo ? "text-yellow-600" : "text-gray-900"}`}>
                            {p.stock}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">
                            {(p.unidadBase || "unidad").toLowerCase()}s
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${estado.color}`}>
                            <IconEstado className="h-3 w-3" />
                            {estado.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {p.fechaVencimiento
                            ? new Date(p.fechaVencimiento).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })
                            : <span className="text-gray-300">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Ver detalles"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                              onClick={() => setDetalle(p)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Editar"
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                                  onClick={() => abrirEditar(p)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Eliminar"
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => eliminar(p.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: ver detalles — disponible para todos */}
      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-[#1e3a5f]">Detalle del producto</DialogTitle>
          </DialogHeader>

          {detalle && (
            <div className="space-y-4 py-1">
              {/* Imagen grande */}
              <div className="w-full h-56 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                {detalle.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detalle.imagen} alt={detalle.nombre} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center text-gray-300">
                    <ImageIcon className="h-12 w-12 mb-1" />
                    <span className="text-xs">Sin imagen</span>
                  </div>
                )}
              </div>

              {/* Nombre + badges */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-gray-900">{detalle.nombre}</h3>
                  {detalle.categoria && (
                    <span className="text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full font-medium shrink-0">
                      {detalle.categoria.nombre}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {[detalle.presentacion, detalle.concentracion].filter(Boolean).join(" · ") || "Sin presentación"}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${estadoStock(detalle.stock, detalle.stockMinimo).color}`}>
                    {estadoStock(detalle.stock, detalle.stockMinimo).label}
                  </span>
                  {detalle.requiereReceta && (
                    <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      Requiere receta médica
                    </span>
                  )}
                </div>
              </div>

              {/* Datos */}
              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                <Dato
                  label={`Precio por ${(detalle.unidadBase || "unidad").toLowerCase()}`}
                  valor={`Q ${parseFloat(detalle.precioVenta).toFixed(2)}`}
                  destacado
                />
                <Dato
                  label="Stock actual"
                  valor={`${detalle.stock} ${(detalle.unidadBase || "unidad").toLowerCase()}s`}
                />
                <Dato
                  label="Umbral de alerta"
                  valor={`${detalle.stockMinimo} ${(detalle.unidadBase || "unidad").toLowerCase()}s`}
                />
                <Dato label="Laboratorio" valor={detalle.laboratorio?.nombre ?? "—"} />
                <Dato label="Código de barras" valor={detalle.codigoBarras || "—"} />
                <Dato
                  label="Próximo vencimiento"
                  valor={
                    detalle.fechaVencimiento
                      ? new Date(detalle.fechaVencimiento).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"
                  }
                />
              </div>

              {/* Formas de venta + cuánto alcanza de cada una con el stock actual */}
              {detalle.unidadesVenta?.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Formas de venta · qué alcanza hoy
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[11px] text-gray-400 uppercase">
                          <th className="text-left font-semibold pb-1.5">Forma</th>
                          <th className="text-right font-semibold pb-1.5">Precio</th>
                          <th className="text-right font-semibold pb-1.5">Te alcanza para</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {/* De mayor a menor: caja, blíster, y al final la unidad suelta */}
                        {[...detalle.unidadesVenta]
                          .sort((a, b) => b.equivale - a.equivale)
                          .map((u) => {
                            const completos = Math.floor(detalle.stock / u.equivale);
                            return (
                              <tr key={u.id} className={completos === 0 ? "opacity-45" : ""}>
                                <td className="py-1.5 text-gray-700">
                                  1 {u.nombre}
                                  <span className="text-gray-400 text-xs">
                                    {" "}· {u.equivale} {(detalle.unidadBase || "unidad").toLowerCase()}s
                                  </span>
                                </td>
                                <td className="py-1.5 text-right text-gray-700">
                                  Q {parseFloat(u.precio).toFixed(2)}
                                </td>
                                <td className="py-1.5 text-right">
                                  {completos > 0 ? (
                                    <span className="font-bold text-[#1e3a5f]">
                                      {completos} {completos === 1 ? "entero" : "enteros"}
                                    </span>
                                  ) : (
                                    <span className="text-red-500 font-medium text-xs">
                                      no alcanza
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        <tr>
                          <td className="py-1.5 text-gray-700">
                            1 {detalle.unidadBase}
                            <span className="text-gray-400 text-xs"> · suelta</span>
                          </td>
                          <td className="py-1.5 text-right text-gray-700">
                            Q {parseFloat(detalle.precioVenta).toFixed(2)}
                          </td>
                          <td className="py-1.5 text-right font-bold text-[#1e3a5f]">
                            {detalle.stock}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    ⚠️ Son las mismas <strong>{detalle.stock} {(detalle.unidadBase || "unidad").toLowerCase()}s</strong>{" "}
                    contadas de distintas formas — <strong>no se suman</strong>. Al vender una forma, las demás bajan.
                  </p>
                </div>
              )}

              {/* Descripción */}
              {detalle.descripcion && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Descripción</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{detalle.descripcion}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog crear/editar — solo admin */}
      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-2 border-b border-gray-100">
              <DialogTitle className="text-[#1e3a5f]">
                {editando ? "Editar producto" : "Nuevo producto"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-1">

              {/* Sección: Identificación */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Identificación</p>

                {/* Guía rápida: el error más común es mezclar presentación y concentración */}
                <details className="mb-4 rounded-lg bg-blue-50 border border-blue-100">
                  <summary className="cursor-pointer select-none px-3 py-2.5 text-xs text-gray-600">
                    💡 <strong>Cómo llenarlo:</strong> los <strong>ml / gramos / unidades</strong> del envase van en{" "}
                    <strong>Presentación</strong>; los <strong>mg</strong> del principio activo van en{" "}
                    <strong>Concentración</strong>.
                    <span className="ml-1 font-semibold text-[#1e3a5f] underline">Ver ejemplos por tipo ▾</span>
                  </summary>
                  <div className="px-3 pb-3 overflow-x-auto">
                    <table className="w-full text-xs border-collapse min-w-[420px]">
                      <thead>
                        <tr className="text-gray-400 border-b border-blue-100">
                          <th className="text-left font-semibold py-1.5 pr-2">Tipo de producto</th>
                          <th className="text-left font-semibold py-1.5 pr-2">Presentación</th>
                          <th className="text-left font-semibold py-1.5">Concentración</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-600">
                        {[
                          ["Tabletas / pastillas", "Caja x 20 tabletas", "500 mg"],
                          ["Cápsulas", "Caja x 12 cápsulas", "500 mg"],
                          ["Jarabe / suspensión", "Frasco 120 ml", "250 mg/5 ml"],
                          ["Gotas", "Frasco 15 ml", "0.5 %"],
                          ["Crema / pomada", "Tubo 30 g", "2 %"],
                          ["Inyectable / ampolla", "Ampolla 5 ml", "100 mg/ml"],
                          ["Supositorios / óvulos", "Caja x 6 supositorios", "300 mg"],
                          ["Sobre / polvo", "Sobre 5 g", "—"],
                          ["Inhalador / spray", "Inhalador 200 dosis", "100 mcg/dosis"],
                          ["No medicamento (termómetro, curitas)", "Unidad · Caja x 40", "— (vacío)"],
                        ].map(([tipo, pres, conc]) => (
                          <tr key={tipo} className="border-b border-blue-50/70 last:border-0">
                            <td className="py-1.5 pr-2">{tipo}</td>
                            <td className="py-1.5 pr-2 font-medium text-gray-700">{pres}</td>
                            <td className="py-1.5 font-medium text-gray-700">{conc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-500 mt-2">
                      El <strong>Nombre</strong> va sin la dosis: <em>Amoxicilina</em> (no &quot;Amoxicilina 500mg&quot;).
                    </p>
                  </div>
                </details>

                {/* Foto del producto */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-20 w-20 shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                    {form.imagen ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.imagen} alt="Vista previa" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-7 w-7 text-gray-300" />
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Foto del producto</label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        {procesandoImg ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {form.imagen ? "Cambiar" : "Subir foto"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImagen}
                          disabled={procesandoImg}
                        />
                      </label>
                      {form.imagen && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, imagen: "" })}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <X className="h-4 w-4" />
                          Quitar
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">JPG o PNG. Se optimiza automáticamente.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nombre *</label>
                    <Input
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      placeholder="Ej: Amoxicilina"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Solo el nombre, sin la dosis (esa va en Concentración).
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Presentación</label>
                    <Input
                      value={form.presentacion}
                      onChange={(e) => setForm({ ...form, presentacion: e.target.value })}
                      placeholder="Ej: Jarabe 120 ml"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Cómo viene empacado: los <strong>ml</strong>, gramos o unidades van aquí.
                      <br />Ej: <em>Caja x 20 tabletas</em>, <em>Frasco 250 ml</em>, <em>Tubo 100 g</em>.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Concentración</label>
                    <Input
                      value={form.concentracion}
                      onChange={(e) => setForm({ ...form, concentracion: e.target.value })}
                      placeholder="Ej: 500 mg"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Cantidad de principio activo (los <strong>mg</strong>).
                      <br />Ej: <em>250 mg/5 ml</em>. Déjalo vacío si no es medicamento.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Código de barras</label>
                    <Input
                      value={form.codigoBarras}
                      onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })}
                      placeholder="Escanear con la pistola o escribir"
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Clasificación */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Clasificación</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Categoría</label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={form.categoriaId}
                      onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                    >
                      <option value="">-- Sin categoría --</option>
                      {categoriasArbol.map((c) => (
                        <option key={c.id} value={String(c.id)}>
                          {c.depth === 0 ? c.nombre : `    ↳ ${c.nombre}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Laboratorio</label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={form.laboratorioId}
                      onChange={(e) => setForm({ ...form, laboratorioId: e.target.value })}
                    >
                      <option value="">-- Ninguno --</option>
                      {laboratorios.map((l) => (
                        <option key={l.id} value={String(l.id)}>{l.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección: Precio y stock */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Precio y stock</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Unidad base *</label>
                    <Input
                      value={form.unidadBase}
                      onChange={(e) => setForm({ ...form, unidadBase: e.target.value })}
                      placeholder="Ej: Pastilla, Frasco, Tubo, Unidad"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      La <strong>unidad más pequeña</strong> que vendes. El stock se cuenta en esta unidad.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Precio por {form.unidadBase.trim().toLowerCase() || "unidad"} (Q) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold pointer-events-none">Q</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-7"
                        value={form.precioVenta}
                        onChange={(e) => setForm({ ...form, precioVenta: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Precio al público de <strong>una</strong> {form.unidadBase.trim().toLowerCase() || "unidad"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Umbral de alerta (en {form.unidadBase.trim().toLowerCase() || "unidad"}s)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={form.stockMinimo}
                      onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Te avisa cuando queden{" "}
                      <strong>
                        {form.stockMinimo || "0"} {form.unidadBase.trim().toLowerCase() || "unidad"}s
                      </strong>{" "}
                      o menos
                    </p>
                  </div>
                </div>
              </div>

              {/* Sección: Formas de venta (blíster, caja...) */}
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Otras formas de venta
                  </p>
                  <Button size="sm" variant="outline" onClick={agregarUnidad} className="h-8 gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    Agregar forma
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Opcional. Úsalo si además de vender por {form.unidadBase.trim().toLowerCase() || "unidad"} suelta,
                  vendes por blíster o caja. Cada forma tiene <strong>su propio precio</strong>.
                </p>

                {form.unidades.length === 0 ? (
                  <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg py-3 text-center">
                    Solo se vende por {form.unidadBase.trim().toLowerCase() || "unidad"} · Agrega una forma si vendes
                    por blíster o caja
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.unidades.map((u, idx) => (
                      <div key={idx} className="flex items-end gap-2 p-2 border border-gray-100 rounded-lg bg-gray-50/50">
                        <div className="flex-1">
                          <label className="text-[11px] font-medium text-gray-500 mb-1 block">Nombre</label>
                          <Input
                            value={u.nombre}
                            onChange={(e) => actualizarUnidad(idx, "nombre", e.target.value)}
                            placeholder="Blíster"
                            className="h-9"
                          />
                        </div>
                        <div className="w-28">
                          <label className="text-[11px] font-medium text-gray-500 mb-1 block">Contiene</label>
                          <Input
                            type="number"
                            min="2"
                            value={u.equivale}
                            onChange={(e) => actualizarUnidad(idx, "equivale", e.target.value)}
                            placeholder="10"
                            className="h-9"
                          />
                        </div>
                        <div className="w-32">
                          <label className="text-[11px] font-medium text-gray-500 mb-1 block">Precio (Q)</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold pointer-events-none">Q</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="pl-6 h-9"
                              value={u.precio}
                              onChange={(e) => actualizarUnidad(idx, "precio", e.target.value)}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => quitarUnidad(idx)}
                          className="h-9 w-9 p-0 shrink-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg">
                      💡 <strong>Contiene</strong> = cuántas {form.unidadBase.trim().toLowerCase() || "unidad"}s trae.
                      Ej: Blíster contiene <strong>10</strong> → al vender 1 blíster se descuentan 10 del stock.
                    </p>
                  </div>
                )}
              </div>

              {/* El stock y el vencimiento entran por Compras, no aquí */}
              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 px-3 py-2.5 rounded-lg">
                💡 Aquí solo defines <strong>qué es</strong> el producto y <strong>a cómo se vende</strong>.
                {!editando && " Se crea con stock en 0."} La <strong>cantidad</strong> y la{" "}
                <strong>fecha de vencimiento</strong> entran al registrar una <strong>Compra</strong>.
              </p>

              {/* Sección: Notas */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Notas</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Descripción</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      placeholder="Indicaciones, composición, usos... (opcional)"
                      value={form.descripcion}
                      onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    />
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="receta"
                      checked={form.requiereReceta}
                      onChange={(e) => setForm({ ...form, requiereReceta: e.target.checked })}
                      className="h-4 w-4 accent-[#1e3a5f]"
                    />
                    <span className="text-sm font-medium text-gray-700">Requiere receta médica</span>
                  </label>
                </div>
              </div>

            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <DialogFooter className="pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={guardar}
                disabled={guardando}
                className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white gap-2"
              >
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                {editando ? "Guardar cambios" : "Crear producto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
