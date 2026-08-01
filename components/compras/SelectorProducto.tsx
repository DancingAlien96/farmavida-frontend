"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Package, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductoOpcion {
  id: number;
  nombre: string;
  presentacion: string | null;
  imagen?: string | null;
}

// Quita acentos y pasa a minúsculas para que "acetaminofen" encuentre "Acetaminofén".
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

interface Props {
  productos: ProductoOpcion[];
  /** id del producto seleccionado como string ("" = ninguno) */
  value: string;
  onChange: (productoId: string) => void;
}

/** Selector de producto con buscador por lupa y foto, para el formulario de compras. */
export function SelectorProducto({ productos, value, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const seleccionado = productos.find((p) => String(p.id) === value) ?? null;

  const resultados = useMemo(() => {
    const q = norm(query.trim());
    const lista = q.length === 0
      ? productos
      : productos.filter(
          (p) =>
            norm(p.nombre).includes(q) ||
            norm(p.presentacion ?? "").includes(q)
        );
    return lista.slice(0, 30);
  }, [productos, query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Al abrir, enfoca el buscador para escribir de una vez
  useEffect(() => {
    if (abierto) inputRef.current?.focus();
  }, [abierto]);

  function elegir(id: number) {
    onChange(String(id));
    setAbierto(false);
    setQuery("");
  }

  return (
    <div ref={ref} className="relative">
      {/* Disparador: muestra el producto elegido (con foto) o el placeholder */}
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className="w-full h-9 px-2 flex items-center gap-2 text-sm border border-gray-200 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#29abe2]/40"
      >
        {seleccionado ? (
          <>
            <span className="h-7 w-7 shrink-0 rounded border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center">
              {seleccionado.imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={seleccionado.imagen} alt={seleccionado.nombre} className="h-full w-full object-cover" />
              ) : (
                <Package className="h-3.5 w-3.5 text-gray-300" />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-gray-900">
              {seleccionado.nombre}
              {seleccionado.presentacion && (
                <span className="text-gray-400"> · {seleccionado.presentacion}</span>
              )}
            </span>
          </>
        ) : (
          <span className="flex-1 text-gray-400">-- Elegir producto --</span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-300" />
      </button>

      {abierto && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
          {/* Buscador con lupa */}
          <div className="relative border-b border-gray-100 p-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar medicamento por nombre..."
              className="w-full h-9 pl-9 pr-8 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#29abe2]/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Resultados con foto */}
          <ul className="max-h-64 overflow-y-auto divide-y divide-gray-50">
            {resultados.length === 0 ? (
              <li className="flex items-center gap-2 px-3 py-4 text-sm text-gray-400">
                <Package className="h-4 w-4 shrink-0" />
                Nada con “{query.trim()}”. Prueba con otro nombre.
              </li>
            ) : (
              resultados.map((p) => {
                const activo = String(p.id) === value;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => elegir(p.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                        activo ? "bg-[#29abe2]/10" : "hover:bg-[#1e3a5f]/5"
                      )}
                    >
                      <span className="h-9 w-9 shrink-0 rounded-md border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center">
                        {p.imagen ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imagen} alt={p.nombre} className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-gray-300" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">{p.nombre}</span>
                        {p.presentacion && (
                          <span className="block text-xs text-gray-400 truncate">{p.presentacion}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
