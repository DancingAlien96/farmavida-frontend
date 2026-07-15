"use client";

import { Minus, Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemCarrito } from "@/hooks/useCarrito";

interface ItemCarritoRowProps {
  item: ItemCarrito;
  onActualizar: (productoId: number, cantidad: number) => void;
  onEliminar: (productoId: number) => void;
}

export function ItemCarritoRow({
  item,
  onActualizar,
  onEliminar,
}: ItemCarritoRowProps) {
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
            {item.presentacion && (
              <p className="text-xs text-gray-400 mt-0.5">{item.presentacion}</p>
            )}
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
            onClick={() => onActualizar(item.productoId, item.cantidad - 1)}
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
            onClick={() => onActualizar(item.productoId, item.cantidad + 1)}
            disabled={item.cantidad >= item.stockDisponible}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-[10px] text-gray-300 mt-0.5 pl-0.5">
          Máx: {item.stockDisponible}
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
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-gray-200 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onEliminar(item.productoId)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}
