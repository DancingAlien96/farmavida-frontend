"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ProductoResumen {
  id: number;
  nombre: string;
  codigoBarras: string | null;
  presentacion: string | null;
  precioVenta: string;
  stock: number;
  imagen: string | null;
  categoria: { nombre: string } | null;
}

interface BuscadorProductoProps {
  productos: ProductoResumen[];
  onSeleccionar: (productoId: number) => void;
  cargando?: boolean;
}

export function BuscadorProducto({
  productos,
  onSeleccionar,
  cargando,
}: BuscadorProductoProps) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const resultados =
    query.trim().length < 2
      ? []
      : productos
          .filter(
            (p) =>
              p.stock > 0 &&
              (p.nombre.toLowerCase().includes(query.toLowerCase()) ||
                (p.codigoBarras ?? "").includes(query) ||
                (p.categoria?.nombre ?? "")
                  .toLowerCase()
                  .includes(query.toLowerCase()))
          )
          .slice(0, 8);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function seleccionar(id: number) {
    onSeleccionar(id);
    setQuery("");
    setAbierto(false);
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
          placeholder="Buscar producto por nombre, código de barras o categoría..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
        />
      </div>

      {abierto && query.trim().length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {resultados.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-400">
              <Package className="h-4 w-4 shrink-0" />
              No se encontraron productos con stock disponible
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {resultados.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors",
                      "flex items-center justify-between gap-4",
                      "hover:bg-[#1e3a5f]/5"
                    )}
                    onClick={() => seleccionar(p.id)}
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
                          {p.presentacion && (
                            <span>{p.presentacion}</span>
                          )}
                          {p.presentacion && p.categoria && <span> · </span>}
                          {p.categoria && (
                            <span className="text-[#1e3a5f]/70">
                              {p.categoria.nombre}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-[#1e3a5f] text-sm">
                        Q {parseFloat(p.precioVenta).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Stock: {p.stock}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
