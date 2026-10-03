"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./AuthProvider";
import { StoreProvider, useStore } from "@/lib/store";
import { LOCATIONS } from "@/lib/locations";

function Login() {
  const { signIn, demo, error } = useAuth();
  return (
    <main className="login">
      <h1>Noticias<span>.</span></h1>
      <p>Noticias relevantes para ti, con fuentes visibles y sin ocultar lo importante.</p>
      <button className="btn primary" onClick={signIn}>{demo ? "Entrar en modo demo" : "Continuar con Google"}</button>
      {demo && <p className="hint">Modo demo: Firebase no está configurado. Se usan noticias de ejemplo ficticias guardadas en este navegador.</p>}
      {error && <p className="error">{error}</p>}
      <details className="hint">
        <summary>¿Cómo instalar la app?</summary>
        <p><b>iPhone:</b> en Safari toca Compartir y luego “Agregar a inicio”.</p>
        <p><b>Android:</b> en Chrome abre el menú y toca “Instalar app”.</p>
      </details>
    </main>
  );
}

function Header() {
  const { location, setLocation, isAdmin } = useStore();
  const { signOut, demo } = useAuth();
  return (
    <header className="top">
      <label className="loc">
        <span>Ubicación simulada</span>
        <select value={location.id} onChange={(e) => setLocation(e.target.value)}>
          {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.label}, {l.country}</option>)}
        </select>
      </label>
      <nav>
        {demo && <span className="badge">demo</span>}
        {isAdmin && <Link href="/admin">Admin</Link>}
        <button className="link" onClick={signOut}>Salir</button>
      </nav>
    </header>
  );
}

function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom">
      <Link href="/" className={path === "/" ? "on" : ""}>Chat</Link>
      <Link href="/feed" className={path.startsWith("/feed") || path.startsWith("/noticia") ? "on" : ""}>Noticias</Link>
    </nav>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  if (loading) return <main className="center">Cargando…</main>;
  if (!user) return <Login />;
  const admin = path.startsWith("/admin");
  return (
    <StoreProvider>
      <div className={admin ? "shell wide" : "shell"}>
        <Header />
        {children}
        {!admin && <BottomNav />}
      </div>
    </StoreProvider>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return <AuthProvider><Gate>{children}</Gate></AuthProvider>;
}
