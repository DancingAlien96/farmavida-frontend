"use client";

import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { useCarrito, ItemCarrito } from "@/hooks/useCarrito";
import {
  BuscadorProducto,
  ProductoResumen,
} from "@/components/pos/BuscadorProducto";
import { ItemCarritoRow } from "@/components/pos/ItemCarrito";
import { PanelCobro, MetodoPago } from "@/components/pos/PanelCobro";
import { SelectorCliente, ClienteLite } from "@/components/pos/SelectorCliente";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { RotateCcw, ShoppingCart } from "lucide-react";

export default function PosPage() {
  const [productos, setProductos] = useState<ProductoResumen[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [errorVenta, setErrorVenta] = useState("");
  const [cliente, setCliente] = useState<ClienteLite | null>(null);

  const {
    items,
    agregar,
    actualizarCantidad,
    eliminar,
    limpiar,
    total,
    totalUnidades,
  } = useCarrito();

  // Cargar catálogo al montar
  useEffect(() => {
    async function cargar() {
      setCargandoProductos(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/productos`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        const data = await res.json();
        setProductos(data);
      } finally {
        setCargandoProductos(false);
      }
    }
    cargar();
  }, []);

  // Seleccionar producto -> obtener lote FIFO y agregar al carrito
  const handleSeleccionar = useCallback(
    async (productoId: number) => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/productos/${productoId}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        const p = await res.json();

        // Lotes ya vienen ordenados por fechaVencimiento asc (FIFO)
        if (!p.lotes || p.lotes.length === 0) return;

        const lote = p.lotes[0];
        const item: ItemCarrito = {
          loteId: lote.id,
          productoId: p.id,
          nombre: p.nombre,
          presentacion: p.presentacion ?? "",
          imagen: p.imagen ?? null,
          precioUnit: parseFloat(p.precioVenta),
          cantidad: 1,
          stockDisponible: lote.cantidadActual,
        };
        agregar(item);
      } catch {
        // silently ignore — user can retry
      }
    },
    [agregar]
  );

  // Registrar venta
  async function handleCobrar(
    metodoPago: MetodoPago,
    efectivoRecibido?: number
  ) {
    if (items.length === 0) return;
    setProcesando(true);
    setErrorVenta("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ventas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            metodoPago,
            clienteId: cliente?.id ?? null,
            items: items.map((i) => ({
              loteId: i.loteId,
              cantidad: i.cantidad,
            })),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setErrorVenta(data.error || "Error al registrar la venta.");
        return;
      }

      const cambio =
        metodoPago === "EFECTIVO" && efectivoRecibido
          ? efectivoRecibido - total
          : 0;

      const mensaje =
        cambio > 0
          ? `Compra realizada · Cambio: Q ${cambio.toFixed(2)}`
          : "Compra realizada";
      toast(mensaje, "success");

      limpiar();
      setCliente(null);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <PageHeader
        title="Punto de Venta"
        subtitle="Registra ventas y gestiona el cobro en caja"
        action={
          items.length > 0 ? (
            <Button
              variant="outline"
              onClick={limpiar}
              className="gap-2 text-gray-600 hover:text-red-600 hover:border-red-300"
            >
              <RotateCcw className="h-4 w-4" />
              Limpiar carrito
            </Button>
          ) : undefined
        }
      />

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Columna izquierda: buscador + carrito ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Buscador */}
          <BuscadorProducto
            productos={productos}
            onSeleccionar={handleSeleccionar}
            cargando={cargandoProductos}
          />

          {/* Carrito */}
          <Card className="overflow-hidden shadow-sm">
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300 select-none">
                  <ShoppingCart className="h-14 w-14 mb-3" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-gray-400">
                    Carrito vacío
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    Busca productos para añadirlos a la venta
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 pl-4 pr-2">
                          Producto
                        </th>
                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2">
                          Cant.
                        </th>
                        <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2">
                          Precio
                        </th>
                        <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-2">
                          Subtotal
                        </th>
                        <th className="py-3 pr-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <ItemCarritoRow
                          key={item.loteId}
                          item={item}
                          onActualizar={actualizarCantidad}
                          onEliminar={eliminar}
                        />
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50">
                        <td
                          colSpan={3}
                          className="py-3.5 pl-4 text-sm font-semibold text-gray-600"
                        >
                          Total ({totalUnidades}{" "}
                          {totalUnidades === 1 ? "unidad" : "unidades"})
                        </td>
                        <td className="py-3.5 px-2 text-right font-bold text-xl text-[#1e3a5f] tabular-nums">
                          Q {total.toFixed(2)}
                        </td>
                        <td className="pr-4" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error de venta */}
          {errorVenta && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {errorVenta}
            </div>
          )}
        </div>

        {/* ── Columna derecha: cliente + panel cobro ── */}
        <div className="lg:col-span-1 space-y-4">
          <SelectorCliente cliente={cliente} onCambiar={setCliente} />
          <PanelCobro
            total={total}
            totalUnidades={totalUnidades}
            loading={procesando}
            onCobrar={handleCobrar}
          />
        </div>
      </div>
    </div>
  );
}
