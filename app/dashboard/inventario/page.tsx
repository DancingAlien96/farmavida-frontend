"use client";

import { useEffect, useState } from "react";
import { getToken, getUser } from "@/lib/auth";
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
  Boxes,
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

interface Producto {
  id: number;
  nombre: string;
  codigoBarras: string | null;
  presentacion: string | null;
  concentracion: string | null;
  precioVenta: string;
  stockMinimo: number;
  descripcion: string | null;
  imagen: string | null;
  requiereReceta: boolean;
  stockTotal: number;
  proximoVencimiento: string | null;
  categoria: { id: number; nombre: string };
  laboratorio: { id: number; nombre: string } | null;
}

interface FormData {
  nombre: string;
  codigoBarras: string;
  presentacion: string;
  concentracion: string;
  precioVenta: string;
  stockMinimo: string;
  requiereReceta: boolean;
  descripcion: string;
  imagen: string;
  categoriaId: string;
  laboratorioId: string;
}

const EMPTY_FORM: FormData = {
  nombre: "",
  codigoBarras: "",
  presentacion: "",
  concentracion: "",
  descripcion: "",
  imagen: "",
  precioVenta: "",
  stockMinimo: "5",
  requiereReceta: false,
  categoriaId: "",
  laboratorioId: "",
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

  // Modal de gestión de lotes
  const [lotesOpen, setLotesOpen] = useState(false);
  const [lotesProducto, setLotesProducto] = useState<Producto | null>(null);
  const [lotesList, setLotesList] = useState<{
    id: number;
    nroLote: string;
    cantidadActual: number;
    fechaVencimiento: string;
    precioCosto: string;
  }[]>([]);
  const [lotesLoading, setLotesLoading] = useState(false);

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
    p.categoria.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
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
      precioVenta: p.precioVenta,
      stockMinimo: String(p.stockMinimo),
      requiereReceta: p.requiereReceta,
      categoriaId: String(p.categoria.id),
      laboratorioId: p.laboratorio ? String(p.laboratorio.id) : "",
    });
    setError("");
    setDialogOpen(true);
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
    if (!form.nombre || !form.precioVenta || !form.categoriaId) {
      setError("Nombre, precio y categoría son obligatorios.");
      return;
    }

    setGuardando(true);
    setError("");
    try {
      const url = editando
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/productos/${editando.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/productos`;
      const method = editando ? "PUT" : "POST";

      const payload: Record<string, unknown> = {
        ...form,
        precioVenta: parseFloat(form.precioVenta),
        stockMinimo: parseInt(form.stockMinimo),
        categoriaId: parseInt(form.categoriaId),
        laboratorioId: form.laboratorioId ? parseInt(form.laboratorioId) : null,
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
    if (!confirm("¿Eliminar este producto del inventario?")) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/productos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    cargarProductos();
  }

  async function abrirLotes(p: Producto) {
    setLotesProducto(p);
    setLotesOpen(true);
    setLotesLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/productos/${p.id}/lotes`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const data = await res.json();
      setLotesList(data);
    } finally {
      setLotesLoading(false);
    }
  }

  // Stats rápidas
  const sinStock = productos.filter((p) => p.stockTotal === 0).length;
  const stockBajo = productos.filter((p) => p.stockTotal > 0 && p.stockTotal <= p.stockMinimo).length;
  const enStock = productos.filter((p) => p.stockTotal > p.stockMinimo).length;

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
        <Card className="border-l-4 border-l-green-500">
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
        <Card className="border-l-4 border-l-yellow-400">
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
        <Card className="border-l-4 border-l-red-500">
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
                    const estado = estadoStock(p.stockTotal, p.stockMinimo);
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
                          <span className="text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full font-medium">
                            {p.categoria.nombre}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-gray-900 text-sm">
                          Q {parseFloat(p.precioVenta).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold text-sm ${p.stockTotal === 0 ? "text-red-600" : p.stockTotal <= p.stockMinimo ? "text-yellow-600" : "text-gray-900"}`}>
                            {p.stockTotal}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">uds</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${estado.color}`}>
                            <IconEstado className="h-3 w-3" />
                            {estado.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {p.proximoVencimiento
                            ? new Date(p.proximoVencimiento).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })
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
                                  title="Ver lotes"
                                  className="h-8 w-8 p-0 text-gray-400 hover:text-[#29abe2] hover:bg-[#29abe2]/10"
                                  onClick={() => abrirLotes(p)}
                                >
                                  <Boxes className="h-3.5 w-3.5" />
                                </Button>
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
                  <span className="text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] px-2 py-0.5 rounded-full font-medium shrink-0">
                    {detalle.categoria.nombre}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {[detalle.presentacion, detalle.concentracion].filter(Boolean).join(" · ") || "Sin presentación"}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${estadoStock(detalle.stockTotal, detalle.stockMinimo).color}`}>
                    {estadoStock(detalle.stockTotal, detalle.stockMinimo).label}
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
                <Dato label="Precio de venta" valor={`Q ${parseFloat(detalle.precioVenta).toFixed(2)}`} destacado />
                <Dato label="Stock actual" valor={`${detalle.stockTotal} uds`} />
                <Dato label="Umbral de alerta" valor={`${detalle.stockMinimo} uds`} />
                <Dato label="Laboratorio" valor={detalle.laboratorio?.nombre ?? "—"} />
                <Dato label="Código de barras" valor={detalle.codigoBarras || "—"} />
                <Dato
                  label="Próximo vencimiento"
                  valor={
                    detalle.proximoVencimiento
                      ? new Date(detalle.proximoVencimiento).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"
                  }
                />
              </div>

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
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Presentación</label>
                    <Input
                      value={form.presentacion}
                      onChange={(e) => setForm({ ...form, presentacion: e.target.value })}
                      placeholder="Ej: Cápsulas 500mg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Concentración</label>
                    <Input
                      value={form.concentracion}
                      onChange={(e) => setForm({ ...form, concentracion: e.target.value })}
                      placeholder="Ej: 500mg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Código de barras</label>
                    <Input
                      value={form.codigoBarras}
                      onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })}
                      placeholder="Escanear o escribir"
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Clasificación */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Clasificación</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Categoría *</label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={form.categoriaId}
                      onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                    >
                      <option value="">-- Seleccionar --</option>
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
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Precio de venta (Q) *</label>
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
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Umbral de alerta
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={form.stockMinimo}
                      onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Avisa cuando el stock baje de este valor
                    </p>
                  </div>
                </div>
              </div>

              {/* El stock inicial ya no se carga aquí: la mercadería entra por Compras */}
              {!editando && (
                <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 px-3 py-2.5 rounded-lg">
                  💡 El producto se crea sin stock. Para ingresar mercadería, registra una <strong>Compra</strong> desde el módulo de Compras.
                </p>
              )}

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

      {/* Dialog gestión de lotes — solo admin */}
      {isAdmin && (
        <Dialog open={lotesOpen} onOpenChange={setLotesOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-2 border-b border-gray-100">
              <DialogTitle className="text-[#1e3a5f] flex items-center gap-2">
                <Boxes className="h-5 w-5" />
                Lotes de {lotesProducto?.nombre}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Tabla de lotes existentes */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Lotes registrados
                </p>
                {lotesLoading ? (
                  <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Cargando lotes...</span>
                  </div>
                ) : lotesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                    <Boxes className="h-8 w-8 mb-1.5" />
                    <p className="text-sm">Aún no hay lotes registrados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-100 rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs font-semibold text-gray-500 uppercase">N° Lote</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Cantidad</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 uppercase">Vencimiento</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Precio costo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lotesList.map((l) => {
                          const venc = new Date(l.fechaVencimiento);
                          const hoy = new Date();
                          const diasParaVencer = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                          const vencido = diasParaVencer < 0;
                          const proximo = diasParaVencer >= 0 && diasParaVencer <= 30;
                          return (
                            <TableRow key={l.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium text-gray-900 text-sm">{l.nroLote}</TableCell>
                              <TableCell className="text-center text-sm">
                                <span className={l.cantidadActual === 0 ? "text-gray-400" : "font-semibold text-gray-900"}>
                                  {l.cantidadActual}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">
                                <span className={vencido ? "text-red-600 font-medium" : proximo ? "text-yellow-600 font-medium" : "text-gray-600"}>
                                  {venc.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                                {vencido && <span className="ml-1.5 text-xs text-red-500">vencido</span>}
                                {proximo && <span className="ml-1.5 text-xs text-yellow-600">en {diasParaVencer}d</span>}
                              </TableCell>
                              <TableCell className="text-right text-sm text-gray-600">
                                Q {parseFloat(l.precioCosto).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 px-3 py-2.5 rounded-lg">
                💡 Los lotes entran automáticamente al registrar una <strong>Compra</strong>. Esta vista es solo de consulta.
              </p>
            </div>

            <DialogFooter className="pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setLotesOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
