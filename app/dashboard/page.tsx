"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign,
  MoreVertical,
  Zap,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Tipos de la API ──────────────────────────────────────────────────────────
interface ProductoApi {
  id: number;
  nombre: string;
  stockMinimo: number;
  stockTotal: number;
  categoria: { nombre: string };
}

interface VentaApi {
  id: number;
  fecha: string;
  total: string;
  metodoPago: string;
  estado: string;
  recetaId: number | null;
  cliente: { nombres: string; apellidos: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DIAS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const q = (n: number) =>
  `Q ${n.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Clave de día local (año-mes-día) para agrupar por fecha
const claveDia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const iniciales = (texto: string) =>
  texto
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0] ?? "")
    .join("")
    .toUpperCase() || "CF";

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  YAPE: "Yape",
  PLIN: "Plin",
};

export default function DashboardPage() {
  const [productos, setProductos] = useState<ProductoApi[]>([]);
  const [ventas, setVentas] = useState<VentaApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const hoy = new Date();
  const hoyLabel = hoy.toLocaleDateString("es-GT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const headers = { Authorization: `Bearer ${getToken()}` };
        const [resProd, resVentas] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/productos`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ventas`, { headers }),
        ]);
        const prod = await resProd.json();
        const vts = await resVentas.json();
        setProductos(Array.isArray(prod) ? prod : []);
        setVentas(Array.isArray(vts) ? vts : []);
      } catch {
        setError("No se pudieron cargar los datos del tablero.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  // ─── Métricas calculadas desde datos reales ──────────────────────────────────
  const completadas = ventas.filter((v) => v.estado === "COMPLETADA");

  const claveHoy = claveDia(hoy);
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  const claveAyer = claveDia(ayer);

  let ventasHoy = 0;
  let ventasAyer = 0;
  let ingresosMes = 0;
  for (const v of completadas) {
    const d = new Date(v.fecha);
    const monto = parseFloat(v.total) || 0;
    const clave = claveDia(d);
    if (clave === claveHoy) ventasHoy += monto;
    if (clave === claveAyer) ventasAyer += monto;
    if (d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth())
      ingresosMes += monto;
  }

  const cambioPct =
    ventasAyer > 0
      ? ((ventasHoy - ventasAyer) / ventasAyer) * 100
      : ventasHoy > 0
      ? 100
      : 0;
  const cambioArriba = cambioPct >= 0;

  const totalProductos = productos.length;
  const bajos = productos.filter((p) => p.stockTotal <= p.stockMinimo);
  const alertas = bajos.length;
  const enBuenNivel = totalProductos - alertas;
  const saludPct = totalProductos > 0 ? Math.round((enBuenNivel / totalProductos) * 100) : 0;
  const saludLabel = saludPct >= 80 ? "Óptimo" : saludPct >= 50 ? "Aceptable" : "Requiere atención";

  const stockCritico = [...bajos]
    .sort((a, b) => a.stockTotal - b.stockTotal)
    .slice(0, 5)
    .map((p) => ({
      nombre: p.nombre,
      categoria: p.categoria.nombre,
      stock: p.stockTotal,
      nivel: p.stockTotal <= Math.ceil(p.stockMinimo / 2) ? "critico" : "bajo",
    }));

  // Gráfico de los últimos 7 días
  const ventasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - (6 - i));
    const clave = claveDia(d);
    const total = completadas
      .filter((v) => claveDia(new Date(v.fecha)) === clave)
      .reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0);
    return { dia: DIAS[d.getDay()], ventas: Math.round(total) };
  });

  // Últimas 5 transacciones (ya vienen ordenadas por fecha desc)
  const recientes = ventas.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resumen de la Farmacia</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Estado en tiempo real del inventario y rendimiento diario.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-2 shrink-0">
          <span>📅</span>
          <span>{hoyLabel}</span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#29abe2]">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ventas de Hoy</span>
              <DollarSign className="h-4 w-4 text-[#29abe2]" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {cargando ? "—" : q(ventasHoy)}
            </p>
            {!cargando && (
              <p className={`text-xs font-medium mt-1 ${cambioArriba ? "text-green-600" : "text-red-500"}`}>
                {cambioArriba ? "↑" : "↓"} {cambioArriba ? "+" : ""}{cambioPct.toFixed(1)}% vs ayer
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Alertas de Stock</span>
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{cargando ? "—" : alertas}</p>
            <p className="text-sm font-semibold text-gray-700">Artículos</p>
            <p className="text-xs text-red-500 font-medium mt-1">
              {alertas > 0 ? "⚠ Requiere reabastecimiento" : "✓ Todo con stock suficiente"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#4a8c3e]">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total de Productos</span>
              <Package className="h-4 w-4 text-[#4a8c3e]" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {cargando ? "—" : totalProductos.toLocaleString("es-GT")}
            </p>
            <p className="text-xs text-[#29abe2] font-medium mt-1">
              {cargando ? "" : `${saludPct}% en buen nivel de stock`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ingresos del Mes</span>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {cargando ? "—" : q(ingresosMes)}
            </p>
            <p className="text-xs text-green-600 font-medium mt-1 capitalize">
              {MESES[hoy.getMonth()]} {hoy.getFullYear()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico + Stock crítico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Tendencia de Ventas</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Ingresos de los últimos 7 días</p>
            </div>
          </CardHeader>
          <CardContent>
            {cargando ? (
              <div className="flex items-center justify-center h-[220px] text-gray-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Cargando...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ventasSemana} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => [`Q ${Number(v).toLocaleString()}`, "Ventas"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="ventas" fill="#29abe2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Panel lateral */}
        <div className="flex flex-col gap-4">
          {/* Stock crítico */}
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Artículos de Stock Crítico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cargando ? (
                <div className="flex items-center justify-center py-6 text-gray-400 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Cargando...</span>
                </div>
              ) : stockCritico.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  Ningún producto por debajo del umbral 🎉
                </p>
              ) : (
                stockCritico.map((item) => (
                  <div key={item.nombre} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.nivel === "critico" ? "bg-red-100" : "bg-orange-100"
                      }`}>
                        <Package className={`h-4 w-4 ${
                          item.nivel === "critico" ? "text-red-500" : "text-orange-500"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{item.nombre}</p>
                        <p className="text-xs text-gray-400 truncate">{item.categoria}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold ${
                        item.nivel === "critico" ? "text-red-500" : "text-orange-500"
                      }`}>{item.stock} Unid.</p>
                      <p className="text-xs text-gray-400">{item.nivel === "critico" ? "Reponer" : "Bajo"}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Salud del inventario */}
          <Card className="bg-[#1e3a5f] text-white">
            <CardContent className="pt-4">
              <p className="text-xs text-white/60 uppercase tracking-wide font-semibold">Salud del Inventario</p>
              <p className="text-2xl font-bold mt-1">{cargando ? "—" : saludLabel}</p>
              <div className="w-full bg-white/20 rounded-full h-1.5 mt-2 mb-3">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${cargando ? 0 : saludPct}%`, backgroundColor: "#7ab648" }}
                />
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                {cargando
                  ? "Calculando el estado del inventario..."
                  : `El ${saludPct}% de tus productos está dentro del margen de stock seguro. ${alertas} ${alertas === 1 ? "artículo requiere" : "artículos requieren"} atención.`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transacciones recientes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <div className="flex items-center justify-center py-10 text-gray-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : recientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Package className="h-8 w-8 mb-2" />
              <p className="text-sm">Aún no hay ventas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-xs text-gray-400 font-semibold uppercase text-left pb-2">ID Venta</th>
                    <th className="text-xs text-gray-400 font-semibold uppercase text-left pb-2">Cliente</th>
                    <th className="text-xs text-gray-400 font-semibold uppercase text-left pb-2">Método</th>
                    <th className="text-xs text-gray-400 font-semibold uppercase text-right pb-2">Monto</th>
                    <th className="text-xs text-gray-400 font-semibold uppercase text-left pb-2 pl-4">Estado</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recientes.map((tx) => {
                    const nombre = tx.cliente
                      ? `${tx.cliente.nombres} ${tx.cliente.apellidos}`
                      : "Consumidor final";
                    const completada = tx.estado === "COMPLETADA";
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 text-gray-500 font-mono text-xs">#V-{tx.id}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-[#1e3a5f]/10 flex items-center justify-center text-xs font-bold text-[#1e3a5f] shrink-0">
                              {tx.cliente ? iniciales(nombre) : "CF"}
                            </div>
                            <span className="font-medium text-gray-800 whitespace-nowrap">{nombre}</span>
                          </div>
                        </td>
                        <td className="py-3 text-gray-500">
                          {METODO_LABEL[tx.metodoPago] ?? tx.metodoPago}
                          {tx.recetaId && (
                            <span className="ml-1.5 text-xs text-purple-600 font-medium">· Receta</span>
                          )}
                        </td>
                        <td className="py-3 font-semibold text-gray-900 text-right whitespace-nowrap">
                          {q(parseFloat(tx.total) || 0)}
                        </td>
                        <td className="py-3 pl-4">
                          <Badge
                            variant={completada ? "default" : "secondary"}
                            className={completada
                              ? "bg-green-100 text-green-700 hover:bg-green-100 text-xs"
                              : "bg-red-100 text-red-700 hover:bg-red-100 text-xs"
                            }
                          >
                            {tx.estado}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <button className="text-gray-400 hover:text-gray-600 p-1">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
