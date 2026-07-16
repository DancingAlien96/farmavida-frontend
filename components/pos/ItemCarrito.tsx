"use client";

import { Minus, Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemCarrito, claveItem } from "@/hooks/useCarrito";

interface ItemCarritoRowProps {
  item: ItemCarrito;
  /** Máximo que se puede llevar de esta línea (ya descuenta lo que ocupan las otras formas) */
  maximo: number;
  onActualizar: (clave: string, cantidad: number) => void;
  onEliminar: (clave: string) => void;
}

export function ItemCarritoRow({
  item,
  maximo,
  onActualizar,
  onEliminar,
}: ItemCarritoRowProps) {
  const clave = claveItem(item.productoId, item.unidadVentaId);
  // Solo tiene sentido aclarar la equivalencia si la forma trae varias unidades base
  const equivalencia = item.unidadEquivale > 1;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors group">
      {/* Producto */}
      <td className="py-3.5 pl-4 pr-2">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-md border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center">
            {item.imagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imagen} alt={item.nombre} className="h-full w-full object-cover" />
            ) : (
              <Package className="h-4 w-4 text-gray-300" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-gray-900 leading-tight">
              {item.nombre}
            </p>
            <p className="text-xs mt-0.5">
              <span className="font-medium text-[#1e3a5f]">{item.unidadNombre}</span>
              {equivalencia && (
                <span className="text-gray-400"> · {item.unidadEquivale} c/u</span>
              )}
              {item.presentacion && (
                <span className="text-gray-400"> · {item.presentacion}</span>
              )}
            </p>
          </div>
        </div>
      </td>

      {/* Cantidad */}
      <td className="py-3.5 px-2">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 text-gray-400 hover:text-[#1e3a5f]"
            onClick={() => onActualizar(clave, item.cantidad - 1)}
            disabled={item.cantidad <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-bold text-gray-900">
            {item.cantidad}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 text-gray-400 hover:text-[#1e3a5f]"
            onClick={() => onActualizar(clave, item.cantidad + 1)}
            disabled={item.cantidad >= maximo}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-[10px] text-gray-300 mt-0.5 pl-0.5">
          Máx: {maximo}
        </p>
      </td>

      {/* Precio unit */}
      <td className="py-3.5 px-2 text-right text-sm text-gray-500 tabular-nums">
        Q {item.precioUnit.toFixed(2)}
      </td>

      {/* Subtotal */}
      <td className="py-3.5 px-2 text-right font-semibold text-sm text-gray-900 tabular-nums">
        Q {(item.precioUnit * item.cantidad).toFixed(2)}
      </td>

      {/* Eliminar */}
      <td className="py-3.5 pr-4 text-right">
        {/* Siempre visible: en tablet no hay "hover" y quedaría inalcanzable */}
        <Button
          variant="ghost"
          size="sm"
          title="Quitar del carrito"
          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          onClick={() => onEliminar(clave)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
