"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, HelpCircle } from "lucide-react";

interface Opciones {
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** Botón de confirmación en rojo (para acciones destructivas). */
  peligro?: boolean;
}

type Solicitud = Opciones & { resolve: (v: boolean) => void };

let emitir: ((s: Solicitud) => void) | null = null;

/**
 * Pide confirmación con un pop-up del sistema (reemplaza a window.confirm).
 * Uso:  if (!(await confirmar("¿Eliminar?"))) return;
 */
export function confirmar(opciones: Opciones | string): Promise<boolean> {
  const op = typeof opciones === "string" ? { mensaje: opciones } : opciones;
  return new Promise((resolve) => {
    if (!emitir) {
      // Fallback por si el diálogo aún no está montado
      resolve(typeof window !== "undefined" ? window.confirm(op.mensaje) : false);
      return;
    }
    emitir({ ...op, resolve });
  });
}

/** Se monta una sola vez (en el layout del dashboard). */
export function ConfirmDialog() {
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);

  useEffect(() => {
    emitir = (s) => setSolicitud(s);
    return () => {
      emitir = null;
    };
  }, []);

  const responder = useCallback(
    (v: boolean) => {
      solicitud?.resolve(v);
      setSolicitud(null);
    },
    [solicitud]
  );

  const peligro = solicitud?.peligro;

  return (
    <Dialog open={!!solicitud} onOpenChange={(o) => !o && responder(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="pb-2 border-b border-gray-100">
          <DialogTitle className={`flex items-center gap-2 ${peligro ? "text-red-600" : "text-[#1e3a5f]"}`}>
            {peligro ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <HelpCircle className="h-5 w-5 text-[#29abe2]" />
            )}
            {solicitud?.titulo ?? "¿Confirmar acción?"}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-600 py-1 leading-relaxed">{solicitud?.mensaje}</p>

        <DialogFooter>
          <Button variant="outline" onClick={() => responder(false)}>
            {solicitud?.textoCancelar ?? "Cancelar"}
          </Button>
          <Button
            onClick={() => responder(true)}
            className={
              peligro
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-[#1e3a5f] hover:bg-[#162d4a] text-white"
            }
          >
            {solicitud?.textoConfirmar ?? "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
