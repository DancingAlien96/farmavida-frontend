"use client";

import { useState, useCallback } from "react";

export interface ItemCarrito {
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
      const idx = prev.findIndex((i) => i.productoId === nuevo.productoId);
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
    (productoId: number, cantidad: number) => {
      setItems((prev) =>
        prev.map((i) =>
          i.productoId === productoId
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

  const eliminar = useCallback((productoId: number) => {
    setItems((prev) => prev.filter((i) => i.productoId !== productoId));
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
