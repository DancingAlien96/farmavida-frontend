"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { saveSession, homeByRole } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.message || "Credenciales incorrectas.");
        return;
      }

      saveSession(data.token, data.usuario);
      router.push(homeByRole(data.usuario.rol));
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1e3a5f] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full bg-[#29abe2]/10" />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full bg-[#4a8c3e]/10" />

        {/* Fondo blanco para que el logo resalte sobre el panel azul */}
        <div className="bg-white rounded-2xl px-8 py-5 mb-10 relative z-10 shadow-lg">
          <Image
            src="/logo-fv.png"
            alt="FarmaVida"
            width={260}
            height={104}
            className="object-contain"
            style={{ width: "auto", height: "auto" }}
            priority
          />
        </div>

        <div className="relative z-10 text-center">
          <h2 className="text-white text-3xl font-bold mb-3">Bienvenido al Sistema</h2>
          <p className="text-white/60 text-base leading-relaxed max-w-sm">
            Gestión integral de tu farmacia: inventario, ventas, recetas y fidelización en un solo lugar.
          </p>
        </div>

        {/* Tarjetas de stats decorativas */}
        <div className="relative z-10 mt-10 grid grid-cols-3 gap-4 w-full max-w-sm">
          {[
            { label: "Productos", value: "2,482" },
            { label: "Clientes", value: "1,340" },
            { label: "Ventas hoy", value: "Q 4,820" },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-lg leading-tight">{s.value}</p>
              <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-gray-50">
        {/* Logo solo visible en móvil */}
        <div className="lg:hidden mb-8">
          <Image
            src="/logo-fv.png"
            alt="FarmaVida"
            width={180}
            height={72}
            className="object-contain"
            style={{ width: "auto", height: "auto" }}
            priority
          />
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Iniciar sesión</h1>
          <p className="text-sm text-gray-500 mb-8">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@farmavida.com"
                className="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#29abe2] focus:border-transparent transition"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 pr-11 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#29abe2] focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Verificando..." : "Ingresar al sistema"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-400">
              FarmaVida · Cuidado y Bienestar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
