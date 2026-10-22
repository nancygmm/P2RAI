"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./AuthProvider";
import { Login } from "./Login";
import { StoreProvider, useStore } from "@/lib/store";
import { LOCATIONS } from "@/lib/locations";
import "@/styles/shell.css";

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function Header() {
  const { location, setLocation } = useStore();
  const { signOut, demo } = useAuth();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setCompact(window.scrollY > 24);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header className={compact ? "top compact" : "top"}>
      <div className="top-bar">
        <Link href="/" className="shell-brand" aria-label="noti8, inicio">
          <span>noti8</span>
          <i className="shell-dot" aria-hidden="true" />
        </Link>
        <label className="loc">
          <span className="loc-kicker">Ubicación simulada</span>
          <span className="loc-pill">
            <PinIcon />
            <span className="loc-text">{location.label}</span>
          </span>
          <select aria-label="Ubicación simulada" value={location.id} onChange={(e) => setLocation(e.target.value)}>
            {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.label}, {l.country}</option>)}
          </select>
        </label>
        <nav className="top-actions">
          {demo && <span className="badge shell-demo">demo</span>}
          {/* Cualquier usuario con sesion puede publicar noticias. */}
          <Link href="/publicar" className="shell-act" aria-label="Publicar noticia">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Publicar</span>
          </Link>
          <button className="link shell-act" onClick={signOut}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" />
            </svg>
            <span>Salir</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

function BottomNav() {
  const path = usePathname();
  const news = path.startsWith("/feed") || path.startsWith("/noticia");
  const idx = news ? 1 : path === "/" ? 0 : -1;
  return (
    <nav className="bottom" aria-label="Principal">
      <div className="bottom-pill" data-idx={idx}>
        <span className="bottom-ind" aria-hidden="true" />
        <Link href="/" className={path === "/" ? "on" : ""} aria-current={path === "/" ? "page" : undefined}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
          </svg>
          <span>Chat</span>
        </Link>
        <Link href="/feed" className={news ? "on" : ""} aria-current={news ? "page" : undefined}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5h12v14H6a2 2 0 0 1-2-2zM16 9h4v8a2 2 0 0 1-2 2M7.5 9h5M7.5 12.5h5" />
          </svg>
          <span>Noticias</span>
        </Link>
      </div>
    </nav>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  if (loading) {
    return (
      <main className="center shell-loading" role="status" aria-live="polite">
        <div className="shell-mark" aria-hidden="true"><i /><b>N</b></div>
        <p>Cargando…</p>
      </main>
    );
  }
  if (!user) return <Login />;
  const admin = path.startsWith("/publicar") || path.startsWith("/admin");
  return (
    <StoreProvider>
      <div className={admin ? "shell wide" : "shell"}>
        <div className="shell-ambient" aria-hidden="true"><i /><i /></div>
        <Header />
        <div key={path} className="shell-page">{children}</div>
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
