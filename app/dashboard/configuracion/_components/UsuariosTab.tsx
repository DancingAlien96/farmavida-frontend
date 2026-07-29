"use client";

import { useEffect, useState } from "react";
import { getToken, getUser } from "@/lib/auth";
import { toast } from "@/components/ui/toast";
import { confirmar } from "@/components/ui/confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Rol = "ADMIN" | "FARMACEUTICO" | "CLIENTE";

interface Usuario {
  id: number;
  email: string;
  rol: Rol;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  cliente: { nombres: string; apellidos: string } | null;
}

interface FormData {
  email: string;
  password: string;
  rol: "ADMIN" | "FARMACEUTICO";
  activo: boolean;
}

const EMPTY_FORM: FormData = {
  email: "",
  password: "",
  rol: "FARMACEUTICO",
  activo: true,
};

function rolBadge(rol: Rol) {
  if (rol === "ADMIN") return "bg-purple-100 text-purple-700";
  if (rol === "FARMACEUTICO") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
}

function rolLabel(rol: Rol) {
  if (rol === "ADMIN") return "Administrador";
  if (rol === "FARMACEUTICO") return "Farmacéutico";
  return "Cliente";
}

export default function UsuariosTab() {
  const [yoId, setYoId] = useState<number | null>(null);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [pwdUsuario, setPwdUsuario] = useState<Usuario | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdGuardando, setPwdGuardando] = useState(false);

  useEffect(() => {
    const u = getUser();
    setYoId(u?.id ?? null);
  }, []);

  async function cargarUsuarios() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/usuarios`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        setUsuarios([]);
        return;
      }
      const data = await res.json();
      setUsuarios(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      rolLabel(u.rol).toLowerCase().includes(busqueda.toLowerCase())
  );

  function abrirCrear() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }

  function abrirEditar(u: Usuario) {
    setEditando(u);
    setForm({
      email: u.email,
      password: "",
      rol: u.rol === "CLIENTE" ? "FARMACEUTICO" : u.rol,
      activo: u.activo,
    });
    setError("");
    setDialogOpen(true);
  }

  async function guardar() {
    setError("");

    if (!form.email) {
      setError("El email es obligatorio.");
      return;
    }
    if (!editando && form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setGuardando(true);
    try {
      if (editando) {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/usuarios/${editando.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({
              email: form.email,
              rol: form.rol,
              activo: form.activo,
            }),
          }
        );
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Error al guardar.");
          return;
        }
      } else {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/usuarios`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            rol: form.rol,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Error al crear el usuario.");
          return;
        }
      }

      setDialogOpen(false);
      cargarUsuarios();
    } finally {
      setGuardando(false);
    }
  }

  function abrirCambioPassword(u: Usuario) {
    setPwdUsuario(u);
    setNuevaPassword("");
    setPwdError("");
    setPwdDialogOpen(true);
  }

  async function guardarPassword() {
    setPwdError("");

    if (nuevaPassword.length < 6) {
      setPwdError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!pwdUsuario) return;

    setPwdGuardando(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/usuarios/${pwdUsuario.id}/password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ password: nuevaPassword }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setPwdError(data.error || "Error al cambiar la contraseña.");
        return;
      }
      setPwdDialogOpen(false);
    } finally {
      setPwdGuardando(false);
    }
  }

  async function alternarActivo(u: Usuario) {
    if (u.id === yoId) {
      toast("No puedes desactivar tu propia cuenta.", "error");
      return;
    }
    const accion = u.activo ? "desactivar" : "activar";
    const ok = await confirmar({
      titulo: `${u.activo ? "Desactivar" : "Activar"} usuario`,
      mensaje: `¿Deseas ${accion} a ${u.email}?`,
      textoConfirmar: u.activo ? "Desactivar" : "Activar",
      peligro: u.activo,
    });
    if (!ok) return;

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/usuarios/${u.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ activo: !u.activo }),
    });
    toast(`Usuario ${u.activo ? "desactivado" : "activado"}`);
    cargarUsuarios();
  }

  const internos = usuarios.filter((u) => u.rol !== "CLIENTE");
  const admins = internos.filter((u) => u.rol === "ADMIN").length;
  const farmaceuticos = internos.filter((u) => u.rol === "FARMACEUTICO").length;
  const inactivos = internos.filter((u) => !u.activo).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={abrirCrear}
          className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Administradores
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{admins}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Farmacéuticos
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{farmaceuticos}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Inactivos
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{inactivos}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base font-semibold">Usuarios</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por email o rol..."
                className="pl-9 h-9 text-sm"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando usuarios...</span>
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users className="h-10 w-10 mb-2" />
              <p className="text-sm">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Email</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Nombre</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Rol</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase">Creado</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosFiltrados.map((u) => (
                    <TableRow key={u.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <p className="font-medium text-gray-900 text-sm">
                          {u.email}
                          {u.id === yoId && (
                            <span className="ml-2 text-xs text-[#29abe2] font-medium">(tú)</span>
                          )}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {u.cliente
                          ? `${u.cliente.nombres} ${u.cliente.apellidos}`
                          : <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${rolBadge(u.rol)}`}>
                          {rolLabel(u.rol)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${u.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {u.activo ? <><CheckCircle2 className="h-3 w-3" /> Activo</> : <><XCircle className="h-3 w-3" /> Inactivo</>}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.rol !== "CLIENTE" && (
                            <Button size="sm" variant="ghost" title="Editar" className="h-8 w-8 p-0 text-gray-400 hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10" onClick={() => abrirEditar(u)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" title="Cambiar contraseña" className="h-8 w-8 p-0 text-gray-400 hover:text-amber-600 hover:bg-amber-50" onClick={() => abrirCambioPassword(u)}>
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          {u.rol !== "CLIENTE" && u.id !== yoId && (
                            <Button size="sm" variant="ghost" title={u.activo ? "Desactivar" : "Activar"} className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => alternarActivo(u)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-[#1e3a5f]">
              {editando ? "Editar usuario" : "Nuevo usuario"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email *</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="usuario@farmavida.com" />
            </div>

            {!editando && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Contraseña *</label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Rol *</label>
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value as "ADMIN" | "FARMACEUTICO" })}
                className="w-full h-9 px-3 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#29abe2]/40 focus:border-[#29abe2]"
              >
                <option value="FARMACEUTICO">Farmacéutico</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>

            {editando && editando.id !== yoId && (
              <div className="flex items-center gap-2">
                <input id="activo" type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
                <label htmlFor="activo" className="text-sm text-gray-700">Usuario activo</label>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={guardando}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando} className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white">
              {guardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editando ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-[#1e3a5f]">Cambiar contraseña</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Asignar nueva contraseña a <span className="font-medium text-gray-900">{pwdUsuario?.email}</span>
            </p>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nueva contraseña *</label>
              <Input type="password" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>

            {pwdError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{pwdError}</p>}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwdDialogOpen(false)} disabled={pwdGuardando}>Cancelar</Button>
            <Button onClick={guardarPassword} disabled={pwdGuardando} className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white">
              {pwdGuardando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cambiar contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
