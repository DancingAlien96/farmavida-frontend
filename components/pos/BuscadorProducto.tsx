"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2, Package, ChevronRight, Sparkles, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UnidadVentaResumen {
  id: number;
  nombre: string;
  equivale: number;
  precio: string;
}

export interface ProductoResumen {
  id: number;
  nombre: string;
  codigoBarras: string | null;
  presentacion: string | null;
  concentracion: string | null;
  descripcion: string | null;
  requiereReceta: boolean;
  fechaVencimiento: string | null;
  unidadBase: string;
  precioVenta: string;
  stock: number;
  imagen: string | null;
  categoria: { nombre: string } | null;
  unidadesVenta: UnidadVentaResumen[];
}

// Quita acentos y pasa a minúsculas para que "fiebre" encuentre "Fiebre".
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Devuelve un fragmento de la descripción alrededor de lo buscado ("…para la fiebre…").
function fragmento(texto: string, q: string, largo = 60): string {
  const t = texto.trim();
  const idx = norm(t).indexOf(q);
  if (idx < 0) return t.length > largo ? t.slice(0, largo) + "…" : t;
  const ini = Math.max(0, idx - 18);
  const fin = Math.min(t.length, idx + q.length + 42);
  return (ini > 0 ? "…" : "") + t.slice(ini, fin).trim() + (fin < t.length ? "…" : "");
}

interface BuscadorProductoProps {
  productos: ProductoResumen[];
  /** `unidadVentaId` null = se vende en la unidad base del producto */
  onSeleccionar: (productoId: number, unidadVentaId: number | null) => void;
  cargando?: boolean;
}

export function BuscadorProducto({
  productos,
  onSeleccionar,
  cargando,
}: BuscadorProductoProps) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);
  // Producto cuyas formas de venta se están mostrando
  const [expandido, setExpandido] = useState<number | null>(null);
  // Producto en la vista rápida de detalles
  const [detalle, setDetalle] = useState<ProductoResumen | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const q = norm(query.trim());
  const resultados =
    q.length < 2
      ? []
      : productos
          .filter((p) => p.stock > 0)
          .map((p) => {
            const enNombre = norm(p.nombre).includes(q);
            const enCodigo = (p.codigoBarras ?? "").includes(query.trim());
            const enCategoria = norm(p.categoria?.nombre ?? "").includes(q);
            const enDescripcion = norm(p.descripcion ?? "").includes(q);
            return {
              p,
              coincide: enNombre || enCodigo || enCategoria || enDescripcion,
              // Se sugiere por el malestar cuando SOLO coincide en la descripción
              porMalestar: enDescripcion && !enNombre && !enCodigo && !enCategoria,
            };
          })
          .filter((r) => r.coincide)
          .slice(0, 8);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
        setExpandido(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function seleccionar(productoId: number, unidadVentaId: number | null) {
    onSeleccionar(productoId, unidadVentaId);
    setQuery("");
    setAbierto(false);
    setExpandido(null);
  }

  /** Si el producto tiene varias formas, pregunta cuál. Si no, lo agrega directo. */
  function elegirProducto(p: ProductoResumen) {
    if (p.unidadesVenta.length === 0) {
      seleccionar(p.id, null);
    } else {
      setExpandido((actual) => (actual === p.id ? null : p.id));
    }
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        {cargando && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
        <Input
          className="pl-10 pr-10 h-12 text-sm bg-white shadow-sm"
          placeholder="Buscar por nombre, código o malestar (ej. fiebre, tos, dolor)..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setAbierto(true);
            setExpandido(null);
          }}
          onFocus={() => setAbierto(true)}
        />
      </div>

      {abierto && query.trim().length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-96 overflow-y-auto">
          {resultados.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-400">
              <Package className="h-4 w-4 shrink-0" />
              Nada con stock para “{query.trim()}”. Prueba con otro nombre o malestar.
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {resultados.map(({ p, porMalestar }) => {
                const base = (p.unidadBase || "unidad").toLowerCase();
                const abiertoEste = expandido === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full text-left px-4 py-3 transition-colors",
                        "flex items-center justify-between gap-4",
                        abiertoEste ? "bg-[#1e3a5f]/5" : "hover:bg-[#1e3a5f]/5"
                      )}
                      onClick={() => elegirProducto(p)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded-md border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center">
                          {p.imagen ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imagen} alt={p.nombre} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-4 w-4 text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {p.nombre}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {p.presentacion && <span>{p.presentacion}</span>}
                            {p.presentacion && p.categoria && <span> · </span>}
                            {p.categoria && (
                              <span className="text-[#1e3a5f]/70">{p.categoria.nombre}</span>
                            )}
                          </p>
                          {/* Cuando se sugiere por lo que trata, muestra el fragmento */}
                          {porMalestar && p.descripcion && (
                            <p className="text-xs text-[#4a8c3e] mt-0.5 flex items-center gap-1 truncate">
                              <Sparkles className="h-3 w-3 shrink-0" />
                              <span className="truncate">{fragmento(p.descripcion, q)}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-1.5">
                        {/* Vista rápida de detalles (no agrega al carrito) */}
                        <span
                          role="button"
                          tabIndex={0}
                          title="Ver detalles"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetalle(p);
                          }}
                          className="p-1.5 rounded-md text-gray-300 hover:text-[#29abe2] hover:bg-[#29abe2]/10 transition-colors"
                        >
                          <Info className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-bold text-[#1e3a5f] text-sm">
                            Q {parseFloat(p.precioVenta).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {p.stock} {base}s
                          </p>
                        </div>
                        {p.unidadesVenta.length > 0 && (
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 text-gray-300 transition-transform",
                              abiertoEste && "rotate-90"
                            )}
                          />
                        )}
                      </div>
                    </button>

                    {/* Formas de venta: solo si el producto tiene más de una */}
                    {abiertoEste && (
                      <div className="bg-gray-50/80 border-t border-gray-100 px-3 py-2">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
                          ¿Cómo lo vendes?
                        </p>
                        <div className="space-y-1">
                          {/* Unidad base */}
                          <button
                            type="button"
                            onClick={() => seleccionar(p.id, null)}
                            className="w-full flex items-center justify-between gap-3 rounded-md bg-white border border-gray-200 px-3 py-2 text-sm hover:border-[#29abe2] hover:bg-[#29abe2]/5 transition-colors"
                          >
                            <span className="text-gray-700">
                              1 {p.unidadBase}
                              <span className="text-gray-400 text-xs"> · suelta</span>
                            </span>
                            <span className="font-semibold text-[#1e3a5f]">
                              Q {parseFloat(p.precioVenta).toFixed(2)}
                            </span>
                          </button>

                          {/* Formas extra (blíster, caja...) */}
                          {p.unidadesVenta.map((u) => {
                            const alcanza = p.stock >= u.equivale;
                            return (
                              <button
                                key={u.id}
                                type="button"
                                disabled={!alcanza}
                                onClick={() => seleccionar(p.id, u.id)}
                                className={cn(
                                  "w-full flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                                  alcanza
                                    ? "bg-white border-gray-200 hover:border-[#29abe2] hover:bg-[#29abe2]/5"
                                    : "bg-gray-100 border-gray-100 cursor-not-allowed opacity-60"
                                )}
                              >
                                <span className="text-gray-700">
                                  1 {u.nombre}
                                  <span className="text-gray-400 text-xs">
                                    {" "}· {u.equivale} {base}s
                                  </span>
                                  {!alcanza && (
                                    <span className="text-red-400 text-xs"> · sin stock suficiente</span>
                                  )}
                                </span>
                                <span className="font-semibold text-[#1e3a5f]">
                                  Q {parseFloat(u.precio).toFixed(2)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ── Vista rápida de detalles del producto ── */}
      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-[#1e3a5f]">Detalle del producto</DialogTitle>
          </DialogHeader>

          {detalle && (
            <div className="space-y-4 py-1">
              {/* Imagen */}
              <div className="w-full h-44 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                {detalle.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detalle.imagen} alt={detalle.nombre} className="h-full w-full object-contain" />
                ) : (
                  <Package className="h-10 w-10 text-gray-300" />
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
                {detalle.requiereReceta && (
                  <span className="inline-block mt-2 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    Requiere receta médica
                  </span>
                )}
              </div>

              {/* Para qué sirve */}
              {detalle.descripcion && (
                <div className="rounded-lg bg-[#4a8c3e]/8 border border-[#4a8c3e]/15 px-3 py-2.5">
                  <p className="text-xs font-semibold text-[#4a8c3e] uppercase tracking-wide mb-0.5">Para qué sirve</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{detalle.descripcion}</p>
                </div>
              )}

              {/* Formas de venta y qué alcanza */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Precios y stock</p>
                  <p className="text-sm font-bold text-gray-900">
                    {detalle.stock} {(detalle.unidadBase || "unidad").toLowerCase()}s
                  </p>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">1 {detalle.unidadBase} · suelta</span>
                    <span className="font-semibold text-[#1e3a5f]">Q {parseFloat(detalle.precioVenta).toFixed(2)}</span>
                  </div>
                  {[...detalle.unidadesVenta]
                    .sort((a, b) => b.equivale - a.equivale)
                    .map((u) => {
                      const completos = Math.floor(detalle.stock / u.equivale);
                      return (
                        <div key={u.id} className="flex items-center justify-between">
                          <span className="text-gray-600">
                            1 {u.nombre}
                            <span className="text-gray-400 text-xs"> · {u.equivale} {(detalle.unidadBase || "unidad").toLowerCase()}s</span>
                            {completos > 0 ? (
                              <span className="text-gray-400 text-xs"> · alcanza {completos}</span>
                            ) : (
                              <span className="text-red-400 text-xs"> · no alcanza</span>
                            )}
                          </span>
                          <span className="font-semibold text-[#1e3a5f]">Q {parseFloat(u.precio).toFixed(2)}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Datos extra */}
              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Vencimiento más próximo</p>
                  <p className="font-medium text-gray-800">
                    {detalle.fechaVencimiento
                      ? new Date(detalle.fechaVencimiento).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Código de barras</p>
                  <p className="font-medium text-gray-800">{detalle.codigoBarras || "—"}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
