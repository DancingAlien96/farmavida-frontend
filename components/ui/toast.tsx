"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let counter = 0;

// Dispara un toast desde cualquier parte de la app.
export function toast(message: string, type: ToastType = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("app-toast", { detail: { id: ++counter, message, type } })
  );
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handler(e: Event) {
      const t = (e as CustomEvent).detail as ToastItem;
      setItems((prev) => [...prev, t]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, 3500);
    }
    window.addEventListener("app-toast", handler);
    return () => window.removeEventListener("app-toast", handler);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => {
        const Icon =
          t.type === "success" ? CheckCircle2 : t.type === "error" ? XCircle : Info;
        const color =
          t.type === "success"
            ? "text-green-600"
            : t.type === "error"
            ? "text-red-600"
            : "text-[#29abe2]";
        return (
          <div
            key={t.id}
            className="flex items-center gap-3 bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3 min-w-[240px] max-w-sm"
          >
            <Icon className={`h-5 w-5 shrink-0 ${color}`} />
            <span className="text-sm font-medium text-gray-800">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
