"use client";

import { useEffect, useState } from "react";
import { getToken, getUser } from "@/lib/auth";
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
  ShoppingBag,
  Search,
  Plus,
  Loader2,
  Eye,
  Ban,
  Trash2,
  CheckCircle2,
  XCircle,
  Truck,
  DollarSign,
} from "lucide-react";

interface CompraLista {
  id: number;
  fecha: string;
  total: string;
  estado: "PENDIENTE" | "RECIBIDA" | "ANULADA";
  observacion: string | null;
  proveedor: { id: number; nombre: string };
  itemsCount: number;
}

interface CompraDetalle {
  id: number;
  fecha: string;
  total: string;
  estado: "PENDIENTE" | "RECIBIDA" | "ANULADA";
  observacion: string | null;
  proveedor: { id: number; nombre: string; ruc: string | null };
  detalles: {
    id: number;
    cantidad: number;
    unidadNombre: string;
    unidadEquivale: number;
    precioCosto: string;
    subtotal: number;
    producto: {
      id: number;
      nombre: string;
      presentacion: string | null;
      unidadBase: string;
    };
  }[];
}

interface Proveedor {
  id: number;
  nombre: string;
  activo: boolean;
}

interface ProductoLista {
  id: number;
  nombre: string;
  presentacion: string | null;
  unidadBase: string;
  unidadesVenta: { id: number; nombre: string; equivale: number }[];
}

interface ItemForm {
  productoId: string;
  // Forma en que entra la mercadería: "" = unidad base, o el id de una forma (caja, blíster)
  unidadVentaId: string;
  cantidad: string;
  precioCosto: string;
  // Opcional: vencimiento de esta entrada
  fechaVencimiento: string;
}

const EMPTY_ITEM: ItemForm = {
  productoId: "",
  unidadVentaId: "",
  cantidad: "",
  precioCosto: "",
  fechaVencimiento: "",
};

function estadoBadge(estado: CompraLista["estado"]) {
  if (estado === "RECIBIDA") return "bg-green-100 text-green-700";
  if (estado === "ANULADA") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

export default function ComprasPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  const [compras, setCompras] = useState<CompraLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<ProductoLista[]>([]);

  // Modal nueva compra
  const [newOpen, setNewOpen] = useState(false);
  const [proveedorId, setProveedorId] = useState("");
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().slice(0, 10));
  const [observacion, setObservacion] = useState("");
  const [items, setItems] = useState<ItemForm[]>([{ ...EMPTY_ITEM }]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Modal detalle
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalle, setDetalle] = useState<CompraDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  useEffect(() => {
    const u = getUser();
    setIsAdmin(u?.rol === "ADMIN");
  }, []);

  async function cargarCompras() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/compras`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        setCompras([]);
        return;
      }
      setCompras(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarCompras();
    const headers = { Authorization: `Bearer ${getToken()}` };
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/proveedores`, { headers }).then((r) => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/productos`, { headers }).then((r) => r.json()),
    ]).then(([provs, prods]) => {
      setProveedores(provs);
      setProductos(prods);
    });
  }, []);

  const comprasFiltradas = compras.filter(
    (c) =>
      c.proveedor.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(c.id).includes(busqueda)
  );

  // Stats
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const comprasMes = compras.filter(
    (c) => new Date(c.fecha) >= inicioMes && c.estado === "RECIBIDA"
  );
  const totalMes = comprasMes.reduce((acc, c) => acc + parseFloat(c.total), 0);
  const recibidas = compras.filter((c) => c.estado === "RECIBIDA").length;
  const anuladas = compras.filter((c) => c.estado === "ANULADA").length;

  function abrirNueva() {
    setProveedorId("");
    setFechaCompra(new Date().toISOString().slice(0, 10));
    setObservacion("");
    setItems([{ ...EMPTY_ITEM }]);
    setError("");
    setNewOpen(true);
  }

  function actualizarItem(idx: number, campo: keyof ItemForm, valor: string) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const actualizado = { ...it, [campo]: valor };
        // Al cambiar de producto, preselecciona la forma más grande (normalmente
        // la caja), que es como suele entrar la mercadería del proveedor.
        if (campo === "productoId") {
          const p = productos.find((x) => String(x.id) === valor);
          const mayor = p?.unidadesVenta?.reduce(
            (max, u) => (!max || u.equivale > max.equivale ? u : max),
            null as { id: number; equivale: number } | null
          );
          actualizado.unidadVentaId = mayor ? String(mayor.id) : "";
        }
        return actualizado;
      })
    );
  }

  function agregarItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function quitarItem(idx: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  const totalCalculado = items.reduce((acc, it) => {
    const c = parseFloat(it.cantidad) || 0;
    const p = parseFloat(it.precioCosto) || 0;
    return acc + c * p;
  }, 0);

  async function guardarCompra() {
    setError("");
    if (!proveedorId) {
      setError("Selecciona un proveedor.");
      return;
    }
    if (items.length === 0) {
      setError("Agrega al menos un item.");
      return;
    }
    for (const [i, it] of items.entries()) {
      if (!it.productoId || !it.cantidad || !it.precioCosto) {
        setError(`Item #${i + 1}: elige el producto e indica cantidad y precio costo.`);
        return;
      }
      if (parseInt(it.cantidad) <= 0) {
        setError(`Item #${i + 1}: la cantidad debe ser mayor a 0.`);
        return;
      }
    }

    setGuardando(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/compras`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          proveedorId: parseInt(proveedorId),
          fecha: fechaCompra,
          observacion: observacion || undefined,
          items: items.map((it) => ({
            productoId: parseInt(it.productoId),
            unidadVentaId: it.unidadVentaId ? parseInt(it.unidadVentaId) : undefined,
            cantidad: parseInt(it.cantidad),
            precioCosto: parseFloat(it.precioCosto),
            fechaVencimiento: it.fechaVencimiento || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al registrar la compra.");
        return;
      }
      setNewOpen(false);
      cargarCompras();
    } finally {
      setGuardando(false);
    }
  }

  async function verDetalle(id: number) {
    setDetalleOpen(true);
    setDetalleLoading(true);
    setDetalle(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/compras/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setDetalle(await res.json());
    } finally {
      setDetalleLoading(false);
    }
  }

  async function anular(id: number) {
    if (!confirm("¿Anular esta compra? Se restará del stock lo que había entrado con ella.")) return;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/compras/${id}/anular`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      }
    );
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "No se pudo anular.");
      return;
    }
    cargarCompras();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Registra ingresos de mercadería de los proveedores
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={abrirNueva}
            className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Compra
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total del mes
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                  Q {totalMes.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {comprasMes.length} compra{comprasMes.length !== 1 ? "s" : ""}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Recibidas
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{recibidas}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Anuladas
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{anuladas}</p>
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
            <CardTitle className="text-base font-semibold">Historial de compras</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por proveedor o #..."
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
              <span className="text-sm">Cargando compras...</span>
            </div>
          ) : comprasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ShoppingBag className="h-10 w-10 mb-2" />
              <p className="text-sm">Aún no hay compras registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">#</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Fecha</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Proveedor</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Items</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Total</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comprasFiltradas.map((c) => (
                    <TableRow key={c.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-mono text-xs text-gray-500">#{c.id}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(c.fecha).toLocaleDateString("es-GT", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        {c.proveedor.nombre}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        {c.itemsCount}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-900 text-sm">
                        Q {parseFloat(c.total).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${estadoBadge(c.estado)}`}>
                          {c.estado}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Ver detalle"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                            onClick={() => verDetalle(c.id)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && c.estado === "RECIBIDA" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Anular"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => anular(c.id)}
                            >
                              <Ban className="h-3.5 w-3.5" />
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

      {/* Modal nueva compra */}
      {isAdmin && (
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-2 border-b border-gray-100">
              <DialogTitle className="text-[#1e3a5f] flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Nueva compra
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Cabecera */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Proveedor *</label>
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#29abe2]/40 focus:border-[#29abe2]"
                  >
                    <option value="">-- Seleccionar --</option>
                    {proveedores.filter((p) => p.activo).map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Fecha</label>
                  <Input
                    type="date"
                    value={fechaCompra}
                    onChange={(e) => setFechaCompra(e.target.value)}
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Items ({items.length})
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={agregarItem}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar item
                  </Button>
                </div>

                {/* Guía: el error más común es poner el total en vez del costo unitario */}
                <details className="mb-3 rounded-lg bg-blue-50 border border-blue-100">
                  <summary className="cursor-pointer select-none px-3 py-2.5 text-xs text-gray-600">
                    💡 <strong>Cómo llenarlo:</strong> el costo es <strong>por unidad</strong>, no el total de la
                    factura. Agrega un item por cada producto distinto.
                    <span className="ml-1 font-semibold text-[#1e3a5f] underline">Ver ejemplos ▾</span>
                  </summary>
                  <div className="px-3 pb-3 overflow-x-auto">
                    <table className="w-full text-xs border-collapse min-w-[440px]">
                      <thead>
                        <tr className="text-gray-400 border-b border-blue-100">
                          <th className="text-left font-semibold py-1.5 pr-2">Lo que compraste</th>
                          <th className="text-left font-semibold py-1.5 pr-2">Cantidad</th>
                          <th className="text-left font-semibold py-1.5 pr-2">Costo por unidad</th>
                          <th className="text-left font-semibold py-1.5">Vence</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-600">
                        {[
                          ["2 sueros a Q5 c/u (pagaste Q10)", "2", "5.00 ✅ (no 10)", "La del envase"],
                          ["1 caja de Acetaminofén a Q15", "1", "15.00", "La de la caja"],
                          ["12 jarabes a Q28 c/u", "12", "28.00", "La del frasco"],
                          ["6 termómetros a Q45 c/u", "6", "45.00", "(vacío, no vence)"],
                        ].map(([caso, cant, costo, vence]) => (
                          <tr key={caso} className="border-b border-blue-50/70 last:border-0">
                            <td className="py-1.5 pr-2">{caso}</td>
                            <td className="py-1.5 pr-2 font-medium text-gray-700">{cant}</td>
                            <td className="py-1.5 pr-2 font-medium text-gray-700">{costo}</td>
                            <td className="py-1.5 text-gray-500">{vence}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-500 mt-2">
                      El <strong>total</strong> lo calcula el sistema solo. Al guardar, la cantidad se{" "}
                      <strong>suma al stock</strong> y la fecha actualiza el vencimiento del producto.
                    </p>
                  </div>
                </details>

                <div className="space-y-3">
                  {items.map((it, idx) => {
                    const subtotal =
                      (parseFloat(it.cantidad) || 0) * (parseFloat(it.precioCosto) || 0);
                    return (
                      <div key={idx} className="p-3 border border-gray-100 rounded-lg bg-gray-50/50">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Producto *</label>
                            <select
                              value={it.productoId}
                              onChange={(e) => actualizarItem(idx, "productoId", e.target.value)}
                              className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#29abe2]/40"
                            >
                              <option value="">-- Elegir producto --</option>
                              {productos.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre}{p.presentacion ? ` · ${p.presentacion}` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={items.length === 1}
                            onClick={() => quitarItem(idx)}
                            className="h-9 w-9 p-0 mt-5 shrink-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Forma en que entra: solo si el producto tiene varias */}
                        {(() => {
                          const prod = productos.find((x) => String(x.id) === it.productoId);
                          if (!prod || prod.unidadesVenta.length === 0) return null;
                          return (
                            <div className="mb-2">
                              <label className="text-xs font-medium text-gray-500 mb-1 block">
                                ¿En qué forma entra? *
                              </label>
                              <select
                                value={it.unidadVentaId}
                                onChange={(e) => actualizarItem(idx, "unidadVentaId", e.target.value)}
                                className="w-full h-9 px-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#29abe2]/40"
                              >
                                <option value="">
                                  {prod.unidadBase} suelta (1 {prod.unidadBase.toLowerCase()})
                                </option>
                                {prod.unidadesVenta.map((u) => (
                                  <option key={u.id} value={String(u.id)}>
                                    {u.nombre} ({u.equivale} {prod.unidadBase.toLowerCase()}s c/u)
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Cantidad *</label>
                            <Input
                              type="number"
                              min="1"
                              value={it.cantidad}
                              onChange={(e) => actualizarItem(idx, "cantidad", e.target.value)}
                              placeholder="0"
                              className="h-9"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">
                              {(() => {
                                const prod = productos.find((x) => String(x.id) === it.productoId);
                                if (!prod) return "Unidades que entran";
                                const u = prod.unidadesVenta.find((x) => String(x.id) === it.unidadVentaId);
                                const n = parseInt(it.cantidad) || 0;
                                if (!u) return `${prod.unidadBase}s que entran`;
                                return `${u.nombre}s → ${n * u.equivale} ${prod.unidadBase.toLowerCase()}s al stock`;
                              })()}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">
                              Costo por unidad (Q) *
                            </label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={it.precioCosto}
                              onChange={(e) => actualizarItem(idx, "precioCosto", e.target.value)}
                              placeholder="0.00"
                              className="h-9"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">
                              Lo que cuesta <strong>cada una</strong>, no el total
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Vence</label>
                            <Input
                              type="date"
                              value={it.fechaVencimiento}
                              onChange={(e) => actualizarItem(idx, "fechaVencimiento", e.target.value)}
                              className="h-9"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">La fecha del envase</p>
                          </div>
                        </div>

                        <p className="text-right text-xs text-gray-500 mt-2">
                          Subtotal: <span className="font-semibold text-gray-900">Q {subtotal.toFixed(2)}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observación + total */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Observación</label>
                  <Input
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Total compra</p>
                  <p className="text-3xl font-bold text-[#1e3a5f] mt-0.5">
                    Q {totalCalculado.toFixed(2)}
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={() => setNewOpen(false)} disabled={guardando}>
                Cancelar
              </Button>
              <Button
                onClick={guardarCompra}
                disabled={guardando}
                className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white gap-2"
              >
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar compra
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal detalle */}
      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-[#1e3a5f] flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Compra {detalle ? `#${detalle.id}` : ""}
            </DialogTitle>
          </DialogHeader>

          {detalleLoading || !detalle ? (
            <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando detalle...</span>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase">Proveedor</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1.5 mt-1">
                    <Truck className="h-4 w-4 text-gray-400" />
                    {detalle.proveedor.nombre}
                  </p>
                  {detalle.proveedor.ruc && (
                    <p className="text-xs text-gray-500 mt-0.5">RUC: {detalle.proveedor.ruc}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Fecha</p>
                  <p className="font-medium text-gray-900 mt-1">
                    {new Date(detalle.fecha).toLocaleDateString("es-GT", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${estadoBadge(detalle.estado)}`}>
                    {detalle.estado}
                  </span>
                </div>
              </div>

              {detalle.observacion && (
                <div className="bg-gray-50 px-3 py-2 rounded-md">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Observación</p>
                  <p className="text-sm text-gray-700">{detalle.observacion}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Items
                </p>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase">Producto</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase">Cantidad</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Costo c/u</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detalle.detalles.map((d) => {
                        // "2 Cajas" en vez de un "2" suelto que no dice de qué
                        const unidad = d.cantidad === 1 ? d.unidadNombre : `${d.unidadNombre}s`;
                        const base = (d.producto.unidadBase || "unidad").toLowerCase();
                        return (
                          <TableRow key={d.id}>
                            <TableCell>
                              <p className="font-medium text-gray-900 text-sm">{d.producto.nombre}</p>
                              {d.producto.presentacion && (
                                <p className="text-xs text-gray-400">{d.producto.presentacion}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <p className="text-sm font-semibold text-gray-900">
                                {d.cantidad} {unidad}
                              </p>
                              {d.unidadEquivale > 1 && (
                                <p className="text-xs text-gray-400">
                                  = {d.cantidad * d.unidadEquivale} {base}s al stock
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <p className="text-sm text-gray-800">
                                Q {parseFloat(d.precioCosto).toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-400">
                                por {d.unidadNombre.toLowerCase()}
                              </p>
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold">
                              Q {d.subtotal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <p className="text-sm text-gray-500">
                  {detalle.detalles.length} item{detalle.detalles.length !== 1 ? "s" : ""}
                </p>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Total</p>
                  <p className="text-2xl font-bold text-[#1e3a5f]">
                    Q {parseFloat(detalle.total).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalleOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
