"use client";

import { useState, useCallback } from "react";

export interface ItemCarrito {
  productoId: number;
  nombre: string;
  presentacion: string;
  imagen: string | null;
  /** Forma de venta elegida. `null` = la unidad base del producto. */
  unidadVentaId: number | null;
  /** Nombre de la forma (ej. "Pastilla", "Blíster"). */
  unidadNombre: string;
  /** Cuántas unidades base contiene (Pastilla=1, Blíster=10). */
  unidadEquivale: number;
  /** Precio de UNA unidad de esta forma. */
  precioUnit: number;
  /** Cantidad en la forma elegida (ej. 2 blísters). */
  cantidad: number;
  /** Stock total del producto, en unidades base. */
  stockBase: number;
}

/** Identifica una línea del carrito: mismo producto en distinta forma va aparte. */
export const claveItem = (productoId: number, unidadVentaId: number | null) =>
  `${productoId}-${unidadVentaId ?? "base"}`;

/** Unidades base ya comprometidas de un producto, opcionalmente ignorando una línea. */
function baseUsadas(items: ItemCarrito[], productoId: number, ignorar?: string): number {
  return items
    .filter(
      (i) =>
        i.productoId === productoId &&
        claveItem(i.productoId, i.unidadVentaId) !== ignorar
    )
    .reduce((acc, i) => acc + i.cantidad * i.unidadEquivale, 0);
}

export function useCarrito() {
  const [items, setItems] = useState<ItemCarrito[]>([]);

  const agregar = useCallback((nuevo: ItemCarrito) => {
    setItems((prev) => {
      const clave = claveItem(nuevo.productoId, nuevo.unidadVentaId);
      const existente = prev.find(
        (i) => claveItem(i.productoId, i.unidadVentaId) === clave
      );

      const cantidadFinal = (existente?.cantidad ?? 0) + nuevo.cantidad;
      // Todas las formas del mismo producto comparten el mismo stock base
      const otras = baseUsadas(prev, nuevo.productoId, clave);
      if (otras + cantidadFinal * nuevo.unidadEquivale > nuevo.stockBase) return prev;

      if (existente) {
        return prev.map((i) =>
          claveItem(i.productoId, i.unidadVentaId) === clave
            ? { ...i, cantidad: cantidadFinal }
            : i
        );
      }
      return [...prev, nuevo];
    });
  }, []);

  const actualizarCantidad = useCallback((clave: string, cantidad: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (claveItem(i.productoId, i.unidadVentaId) !== clave) return i;
        const otras = baseUsadas(prev, i.productoId, clave);
        const disponibleBase = i.stockBase - otras;
        const maximo = Math.max(1, Math.floor(disponibleBase / i.unidadEquivale));
        return { ...i, cantidad: Math.max(1, Math.min(cantidad, maximo)) };
      })
    );
  }, []);

  const eliminar = useCallback((clave: string) => {
    setItems((prev) =>
      prev.filter((i) => claveItem(i.productoId, i.unidadVentaId) !== clave)
    );
  }, []);

  const limpiar = useCallback(() => setItems([]), []);

  const total = items.reduce((acc, i) => acc + i.precioUnit * i.cantidad, 0);
  const totalUnidades = items.reduce((acc, i) => acc + i.cantidad, 0);

  /** Máximo que se puede llevar de una línea, según lo que ya ocupan las demás. */
  const maximoDe = useCallback(
    (item: ItemCarrito) => {
      const clave = claveItem(item.productoId, item.unidadVentaId);
      const otras = baseUsadas(items, item.productoId, clave);
      return Math.floor((item.stockBase - otras) / item.unidadEquivale);
    },
    [items]
  );

  return {
    items,
    agregar,
    actualizarCantidad,
    eliminar,
    limpiar,
    total,
    totalUnidades,
    maximoDe,
  };
}
