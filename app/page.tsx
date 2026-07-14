import { redirect } from "next/navigation";

// El middleware ya protege las rutas. Esta raíz redirige al dashboard
// (si no hay sesión, el middleware interceptará y mandará al login).
export default function Home() {
  redirect("/dashboard");
}

