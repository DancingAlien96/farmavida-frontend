const TOKEN_KEY = "fv_token";
const USER_KEY = "fv_user";

export interface AuthUser {
  id: number;
  email: string;
  rol: "ADMIN" | "FARMACEUTICO" | "CLIENTE";
}

// Guarda token y usuario en cookies legibles por el middleware
export function saveSession(token: string, user: AuthUser) {
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 horas
  document.cookie = `${TOKEN_KEY}=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Strict`;
  document.cookie = `${USER_KEY}=${encodeURIComponent(JSON.stringify(user))}; path=/; expires=${expires.toUTCString()}; SameSite=Strict`;
}

export function clearSession() {
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  document.cookie = `${USER_KEY}=; path=/; max-age=0`;
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`));
  return match ? match[1] : null;
}

export function getUser(): AuthUser | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${USER_KEY}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

// Retorna la ruta home según el rol
export function homeByRole(rol: AuthUser["rol"]): string {
  if (rol === "CLIENTE") return "/mi-cuenta";
  return "/dashboard";
}
