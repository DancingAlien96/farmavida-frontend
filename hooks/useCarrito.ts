"use client";

import { useState, useCallback } from "react";

export interface ItemCarrito {
  loteId: number;
  productoId: number;
  nombre: string;
  presentacion: string;
  imagen: string | null;
  precioUnit: number;
  cantidad: number;
  stockDisponible: number;
}

export function useCarrito() {
  const [items, setItems] = useState<ItemCarrito[]>([]);

  const agregar = useCallback((nuevo: ItemCarrito) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.loteId === nuevo.loteId);
      if (idx !== -1) {
        const nuevaCantidad = prev[idx].cantidad + nuevo.cantidad;
        if (nuevaCantidad > prev[idx].stockDisponible) return prev;
        return prev.map((i, j) =>
          j === idx ? { ...i, cantidad: nuevaCantidad } : i
        );
      }
      return [...prev, nuevo];
    });
  }, []);

  const actualizarCantidad = useCallback(
    (loteId: number, cantidad: number) => {
      setItems((prev) =>
        prev.map((i) =>
          i.loteId === loteId
            ? {
                ...i,
                cantidad: Math.max(1, Math.min(cantidad, i.stockDisponible)),
              }
            : i
        )
      );
    },
    []
  );

  const eliminar = useCallback((loteId: number) => {
    setItems((prev) => prev.filter((i) => i.loteId !== loteId));
  }, []);

  const limpiar = useCallback(() => setItems([]), []);

  const total = items.reduce(
    (acc, i) => acc + i.precioUnit * i.cantidad,
    0
  );

  const totalUnidades = items.reduce((acc, i) => acc + i.cantidad, 0);

  return {
    items,
    agregar,
    actualizarCantidad,
    eliminar,
    limpiar,
    total,
    totalUnidades,
  };
}
