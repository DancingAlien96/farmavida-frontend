"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Banknote,
  ArrowLeftRight,
  Loader2,
  ShoppingBag,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MetodoPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";

const METODOS: {
  value: MetodoPago;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "EFECTIVO", label: "Efectivo", icon: Banknote },
  { value: "TARJETA", label: "Tarjeta", icon: CreditCard },
  { value: "TRANSFERENCIA", label: "Transferencia", icon: ArrowLeftRight },
];

interface PanelCobroProps {
  total: number;
  totalUnidades: number;
  loading: boolean;
  /** Nombre del cliente, para mostrarlo en la confirmación */
  clienteNombre?: string;
  onCobrar: (metodoPago: MetodoPago, efectivoRecibido?: number) => void;
}

export function PanelCobro({
  total,
  totalUnidades,
  loading,
  clienteNombre,
  onCobrar,
}: PanelCobroProps) {
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [efectivo, setEfectivo] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  const efectivoNum = parseFloat(efectivo) || 0;
  const cambio =
    metodo === "EFECTIVO" && efectivoNum > 0 ? efectivoNum - total : null;
  const faltan =
    metodo === "EFECTIVO" && efectivoNum > 0 && efectivoNum < total
      ? total - efectivoNum
      : 0;

  const puedesCobrar =
    totalUnidades > 0 &&
    (metodo !== "EFECTIVO" || efectivoNum >= total);

  const metodoLabel = METODOS.find((m) => m.value === metodo)?.label ?? metodo;

  /** Al pulsar Cobrar solo se abre la confirmación; la venta se hace al confirmar. */
  function pedirConfirmacion() {
    setConfirmando(true);
  }

  function confirmarCobro() {
    setConfirmando(false);
    onCobrar(metodo, metodo === "EFECTIVO" ? efectivoNum : undefined);
    setEfectivo("");
  }

  return (
    <Card className="sticky top-4 shadow-sm">
      <CardHeader className="pb-4 border-b border-gray-100">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-[#1e3a5f]">
          <ShoppingBag className="h-4 w-4" />
          Resumen de Venta
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* Estado carrito */}
        <div className="text-center py-1">
          {totalUnidades === 0 ? (
            <p className="text-sm text-gray-400">Sin productos en el carrito</p>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-[#1e3a5f]/8 text-[#1e3a5f] rounded-full px-3 py-1.5">
              <span className="font-bold text-sm">{totalUnidades}</span>
              <span className="text-xs">
                {totalUnidades === 1 ? "producto" : "productos"}
              </span>
            </div>
          )}
        </div>

        {/* Método de pago */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
            Método de pago
          </p>
          <div className="grid grid-cols-3 gap-2">
            {METODOS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMetodo(value);
                  setEfectivo("");
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border-2 text-xs font-semibold transition-all",
                  metodo === value
                    ? "border-[#1e3a5f] bg-[#1e3a5f] text-white shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/5"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Efectivo recibido */}
        {metodo === "EFECTIVO" && (
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Efectivo recibido
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400 pointer-events-none">
                Q
              </span>
              <Input
                type="number"
                min="0"
                step="0.50"
                className="pl-8 h-11"
                placeholder="0.00"
                value={efectivo}
                onChange={(e) => setEfectivo(e.target.value)}
              />
            </div>

            {/* Cambio o faltante */}
            {cambio !== null && cambio >= 0 && (
              <div className="mt-2 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <span className="text-xs font-semibold text-green-600">
                  Cambio
                </span>
                <span className="text-sm font-bold text-green-600">
                  Q {cambio.toFixed(2)}
                </span>
              </div>
            )}
            {faltan > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Faltan Q {faltan.toFixed(2)} para completar el pago
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Totales */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal ({totalUnidades} uds)</span>
            <span className="tabular-nums">Q {total.toFixed(2)}</span>
          </div>
          <Separator className="opacity-50" />
          <div className="flex justify-between font-bold text-xl text-[#1e3a5f]">
            <span>Total</span>
            <span className="tabular-nums">Q {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Botón cobrar */}
        <Button
          className={cn(
            "w-full h-13 text-base font-bold gap-2 transition-all",
            puedesCobrar && !loading
              ? "bg-[#29abe2] hover:bg-[#1e90c8] text-white shadow-md hover:shadow-lg"
              : "bg-gray-100 text-gray-400"
          )}
          disabled={!puedesCobrar || loading}
          onClick={pedirConfirmacion}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5" />
              Cobrar Q {total.toFixed(2)}
            </>
          )}
        </Button>

        {/* Confirmación antes de registrar la venta */}
        <Dialog open={confirmando} onOpenChange={setConfirmando}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader className="pb-2 border-b border-gray-100">
              <DialogTitle className="text-[#1e3a5f] flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-[#29abe2]" />
                ¿Confirmas el cobro?
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-1">
              {/* Total grande, que es lo que importa */}
              <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/10 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                  Total a cobrar
                </p>
                <p className="text-3xl font-bold text-[#1e3a5f] mt-1 tabular-nums">
                  Q {total.toFixed(2)}
                </p>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Productos</span>
                  <span className="font-medium text-gray-800">
                    {totalUnidades} {totalUnidades === 1 ? "ítem" : "ítems"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cliente</span>
                  <span className="font-medium text-gray-800">
                    {clienteNombre || "Consumidor final"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Método de pago</span>
                  <span className="font-medium text-gray-800">{metodoLabel}</span>
                </div>
                {metodo === "EFECTIVO" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Recibe</span>
                      <span className="font-medium text-gray-800 tabular-nums">
                        Q {efectivoNum.toFixed(2)}
                      </span>
                    </div>
                    {cambio !== null && cambio > 0 && (
                      <div className="flex justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 mt-1">
                        <span className="font-semibold text-green-700">Cambio a devolver</span>
                        <span className="font-bold text-green-700 tabular-nums">
                          Q {cambio.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <p className="text-xs text-gray-400 text-center">
                Se descontará el stock. Si te equivocas, un administrador puede anular la venta.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmando(false)}>
                Cancelar
              </Button>
              <Button
                onClick={confirmarCobro}
                className="bg-[#29abe2] hover:bg-[#1e90c8] text-white gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Sí, cobrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
