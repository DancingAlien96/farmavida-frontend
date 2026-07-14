"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Banknote,
  ArrowLeftRight,
  Loader2,
  ShoppingBag,
  AlertCircle,
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
  onCobrar: (metodoPago: MetodoPago, efectivoRecibido?: number) => void;
}

export function PanelCobro({
  total,
  totalUnidades,
  loading,
  onCobrar,
}: PanelCobroProps) {
  const [metodo, setMetodo] = useState<MetodoPago>("EFECTIVO");
  const [efectivo, setEfectivo] = useState("");

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

  function handleCobrar() {
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
          onClick={handleCobrar}
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
      </CardContent>
    </Card>
  );
}
