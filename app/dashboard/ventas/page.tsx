"use client";

import { useEffect, useState } from "react";
import { getToken, getUser } from "@/lib/auth";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Receipt,
  Search,
  Loader2,
  Eye,
  Ban,
  DollarSign,
  ShoppingBag,
  XCircle,
  User,
  CalendarDays,
  Printer,
} from "lucide-react";

interface DetalleVenta {
  id: number;
  cantidad: number;
  precioUnit: string;
  subtotal: string;
  lote: { producto: { nombre: string; presentacion: string | null } };
}

interface Venta {
  id: number;
  fecha: string;
  total: string;
  metodoPago: string;
  estado: string;
  observacion: string | null;
  cliente: { nombres: string; apellidos: string } | null;
  farmaceutico: { email: string };
  detalles: DetalleVenta[];
}

type Periodo = "hoy" | "semana" | "mes" | "todo";

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "7 días" },
  { id: "mes", label: "Este mes" },
  { id: "todo", label: "Todo" },
];

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  YAPE: "Yape",
  PLIN: "Plin",
};

const q = (n: number) =>
  `Q ${n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function enPeriodo(fechaISO: string, periodo: Periodo): boolean {
  if (periodo === "todo") return true;
  const f = new Date(fechaISO);
  const hoy = new Date();
  if (periodo === "hoy") {
    return (
      f.getFullYear() === hoy.getFullYear() &&
      f.getMonth() === hoy.getMonth() &&
      f.getDate() === hoy.getDate()
    );
  }
  if (periodo === "mes") {
    return f.getFullYear() === hoy.getFullYear() && f.getMonth() === hoy.getMonth();
  }
  // semana: últimos 7 días (incluye hoy)
  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - 6);
  inicio.setHours(0, 0, 0, 0);
  return f >= inicio;
}

export default function VentasPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("hoy");
  const [busqueda, setBusqueda] = useState("");

  const [detalle, setDetalle] = useState<Venta | null>(null);

  const [anularVenta, setAnularVenta] = useState<Venta | null>(null);
  const [motivo, setMotivo] = useState("");
  const [anulando, setAnulando] = useState(false);
  const [anularError, setAnularError] = useState("");

  useEffect(() => {
    setIsAdmin(getUser()?.rol === "ADMIN");
  }, []);

  async function cargar() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ventas`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setVentas(Array.isArray(data) ? data : []);
    } catch {
      setVentas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  const nombreCliente = (v: Venta) =>
    v.cliente ? `${v.cliente.nombres} ${v.cliente.apellidos}` : "Consumidor final";

  const porPeriodo = ventas.filter((v) => enPeriodo(v.fecha, periodo));
  const filtradas = porPeriodo.filter(
    (v) =>
      String(v.id).includes(busqueda.trim()) ||
      nombreCliente(v).toLowerCase().includes(busqueda.toLowerCase())
  );

  // Stats del período
  const completadas = porPeriodo.filter((v) => v.estado === "COMPLETADA");
  const anuladas = porPeriodo.filter((v) => v.estado === "ANULADA");
  const ingresos = completadas.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0);

  async function confirmarAnular() {
    if (!anularVenta) return;
    setAnulando(true);
    setAnularError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ventas/${anularVenta.id}/anular`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ motivo }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setAnularError(data.error || "No se pudo anular la venta.");
        return;
      }
      setAnularVenta(null);
      setMotivo("");
      cargar();
    } finally {
      setAnulando(false);
    }
  }

  const fechaLarga = (iso: string) =>
    new Date(iso).toLocaleString("es-GT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Genera un informe imprimible (PDF vía "Guardar como PDF") con las ventas
  // actualmente filtradas (período + búsqueda).
  function imprimirInforme() {
    const w = window.open("", "_blank", "width=980,height=800");
    if (!w) {
      toast("Permite las ventanas emergentes para imprimir el informe", "error");
      return;
    }
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const periodoLabel = PERIODOS.find((p) => p.id === periodo)?.label ?? "";
    const generado = new Date().toLocaleString("es-GT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const filas = filtradas
      .map(
        (v) => `
      <tr class="${v.estado === "ANULADA" ? "anulada" : ""}">
        <td>#V-${v.id}</td>
        <td>${fechaLarga(v.fecha)}</td>
        <td>${esc(nombreCliente(v))}</td>
        <td>${METODO_LABEL[v.metodoPago] ?? v.metodoPago}</td>
        <td class="r">${q(parseFloat(v.total) || 0)}</td>
        <td>${v.estado === "ANULADA" ? "Anulada" : "Completada"}</td>
      </tr>`
      )
      .join("");

    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
      <title>Informe de Ventas - FarmaVida</title>
      <style>
        * { font-family: 'Segoe UI', Arial, sans-serif; box-sizing: border-box; }
        body { margin: 32px; color: #1f2937; }
        .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1e3a5f; padding-bottom:12px; margin-bottom:20px; }
        .brand { font-size:22px; font-weight:800; color:#1e3a5f; }
        .brand span { color:#29abe2; }
        .sub { font-size:12px; color:#6b7280; margin-top:2px; }
        .meta { text-align:right; font-size:12px; color:#6b7280; }
        .cards { display:flex; gap:12px; margin-bottom:18px; }
        .card { flex:1; border:1px solid #e5e7eb; border-radius:10px; padding:12px 14px; }
        .card .lbl { font-size:10px; text-transform:uppercase; color:#9ca3af; font-weight:700; letter-spacing:.04em; }
        .card .val { font-size:20px; font-weight:800; color:#111827; margin-top:2px; }
        table { width:100%; border-collapse:collapse; font-size:12px; }
        th { text-align:left; background:#f9fafb; color:#6b7280; text-transform:uppercase; font-size:10px; padding:8px; border-bottom:2px solid #e5e7eb; }
        td { padding:8px; border-bottom:1px solid #f3f4f6; }
        td.r, th.r { text-align:right; }
        tr.anulada td { color:#9ca3af; text-decoration:line-through; }
        .foot { margin-top:20px; font-size:10px; color:#9ca3af; text-align:center; }
        @media print { body { margin: 12px; } }
      </style></head>
      <body onload="window.print()">
        <div class="head">
          <div>
            <div class="brand">Farma<span>Vida</span></div>
            <div class="sub">Informe de Ventas${
              busqueda.trim() ? ` — búsqueda: "${esc(busqueda.trim())}"` : ""
            }</div>
          </div>
          <div class="meta">
            <div><strong>Período:</strong> ${periodoLabel}</div>
            <div>Generado: ${generado}</div>
          </div>
        </div>
        <div class="cards">
          <div class="card"><div class="lbl">Ventas</div><div class="val">${completadas.length}</div></div>
          <div class="card"><div class="lbl">Ingresos</div><div class="val">${q(ingresos)}</div></div>
          <div class="card"><div class="lbl">Anuladas</div><div class="val">${anuladas.length}</div></div>
        </div>
        <table>
          <thead><tr>
            <th>Venta</th><th>Fecha</th><th>Cliente</th><th>Método</th><th class="r">Total</th><th>Estado</th>
          </tr></thead>
          <tbody>${
            filas ||
            `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:24px">Sin ventas en este período</td></tr>`
          }</tbody>
        </table>
        <div class="foot">FarmaVida — Sistema de gestión farmacéutica · ${filtradas.length} registro(s)</div>
      </body></html>`;

    w.document.write(html);
    w.document.close();
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Ventas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Consulta, revisa el detalle y anula ventas registradas
          </p>
        </div>
        <Button
          onClick={imprimirInforme}
          disabled={loading || filtradas.length === 0}
          className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white gap-2"
        >
          <Printer className="h-4 w-4" />
          Imprimir informe
        </Button>
      </div>

      {/* Stats del período */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-[#29abe2]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ventas</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{completadas.length}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-[#29abe2]/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ingresos</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{q(ingresos)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Anuladas</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{anuladas.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
            <CardTitle className="text-base font-semibold">Ventas</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Filtro de período */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {PERIODOS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPeriodo(p.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      periodo === p.id
                        ? "bg-white text-[#1e3a5f] shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {/* Búsqueda */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por # o cliente..."
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
              <span className="text-sm">Cargando ventas...</span>
            </div>
          ) : filtradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Receipt className="h-10 w-10 mb-2" />
              <p className="text-sm">No hay ventas en este período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Venta</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Fecha</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Cliente</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Método</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Ítems</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Total</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((v) => {
                    const anulada = v.estado === "ANULADA";
                    return (
                      <TableRow key={v.id} className={`hover:bg-gray-50 transition-colors ${anulada ? "opacity-60" : ""}`}>
                        <TableCell className="font-mono text-xs text-gray-500">#V-{v.id}</TableCell>
                        <TableCell className="text-sm text-gray-600 whitespace-nowrap">{fechaLarga(v.fecha)}</TableCell>
                        <TableCell className="text-sm text-gray-900 font-medium">{nombreCliente(v)}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {METODO_LABEL[v.metodoPago] ?? v.metodoPago}
                        </TableCell>
                        <TableCell className="text-center text-sm text-gray-600">{v.detalles.length}</TableCell>
                        <TableCell className={`text-right font-semibold text-sm ${anulada ? "line-through text-gray-400" : "text-gray-900"}`}>
                          {q(parseFloat(v.total) || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={anulada
                              ? "bg-red-100 text-red-700 hover:bg-red-100 text-xs"
                              : "bg-green-100 text-green-700 hover:bg-green-100 text-xs"}
                          >
                            {anulada ? "Anulada" : "Completada"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Ver detalle"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                              onClick={() => setDetalle(v)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {isAdmin && !anulada && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Anular venta"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setAnularVenta(v);
                                  setMotivo("");
                                  setAnularError("");
                                }}
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
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

      {/* Modal detalle */}
      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-[#1e3a5f] flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Venta #V-{detalle?.id}
              {detalle?.estado === "ANULADA" && (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs ml-1">Anulada</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {detalle && (
            <div className="space-y-4 py-1">
              {/* Info general */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" />
                  {fechaLarga(detalle.fecha)}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4 text-gray-400 shrink-0" />
                  {nombreCliente(detalle)}
                </div>
                <div className="text-gray-500">
                  Método: <span className="text-gray-700 font-medium">{METODO_LABEL[detalle.metodoPago] ?? detalle.metodoPago}</span>
                </div>
                <div className="text-gray-500">
                  Vendedor: <span className="text-gray-700 font-medium">{detalle.farmaceutico.email}</span>
                </div>
              </div>

              {/* Items */}
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-400 uppercase">
                      <th className="text-left font-semibold px-3 py-2">Producto</th>
                      <th className="text-center font-semibold px-2 py-2">Cant.</th>
                      <th className="text-right font-semibold px-2 py-2">Precio</th>
                      <th className="text-right font-semibold px-3 py-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {detalle.detalles.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-2 text-gray-800">
                          {d.lote.producto.nombre}
                          {d.lote.producto.presentacion && (
                            <span className="text-gray-400 text-xs"> · {d.lote.producto.presentacion}</span>
                          )}
                        </td>
                        <td className="text-center px-2 py-2 text-gray-600">{d.cantidad}</td>
                        <td className="text-right px-2 py-2 text-gray-600 tabular-nums">{q(parseFloat(d.precioUnit) || 0)}</td>
                        <td className="text-right px-3 py-2 font-medium text-gray-900 tabular-nums">{q(parseFloat(d.subtotal) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center bg-[#1e3a5f]/5 rounded-lg px-4 py-3">
                <span className="text-sm font-semibold text-gray-600">Total</span>
                <span className={`text-xl font-bold ${detalle.estado === "ANULADA" ? "line-through text-gray-400" : "text-[#1e3a5f]"}`}>
                  {q(parseFloat(detalle.total) || 0)}
                </span>
              </div>

              {detalle.observacion && (
                <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
                  <span className="font-semibold">Observación:</span> {detalle.observacion}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal anular */}
      <Dialog open={!!anularVenta} onOpenChange={(o) => !o && setAnularVenta(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Anular venta #V-{anularVenta?.id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <p className="text-sm text-gray-600">
              Se marcará la venta como <strong>anulada</strong> y el stock de sus productos
              volverá al inventario. Esta acción no se puede deshacer.
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Motivo (opcional)</label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder="Ej: error en el cobro, devolución del cliente..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
            {anularError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {anularError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAnularVenta(null)} disabled={anulando}>
              Cancelar
            </Button>
            <Button
              onClick={confirmarAnular}
              disabled={anulando}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {anulando && <Loader2 className="h-4 w-4 animate-spin" />}
              Anular venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
