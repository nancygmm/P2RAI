"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider, getRedirectResult, onAuthStateChanged,
  signInWithPopup, signInWithRedirect, signOut as fbSignOut,
} from "firebase/auth";
import { IS_DEMO, fbAuth } from "@/lib/firebase";

export interface AppUser { uid: string; name: string; email: string; photo?: string | null }

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  demo: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Token para las rutas de API (vacio en modo demo). */
  getToken: () => Promise<string>;
}

const Ctx = createContext<AuthCtx | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fuera de AuthProvider");
  return c;
};

const DEMO_KEY = "p2rai_demo_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_DEMO) {
      try { if (localStorage.getItem(DEMO_KEY)) setUser({ uid: "demo", name: "Usuario demo", email: "demo@example.com" }); } catch {}
      setLoading(false);
      return;
    }
    const auth = fbAuth();
    getRedirectResult(auth).catch((e) => setError(e.message));
    return onAuthStateChanged(auth, (u) => {
      setUser(u ? { uid: u.uid, name: u.displayName ?? "Usuario", email: u.email ?? "", photo: u.photoURL } : null);
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    if (IS_DEMO) {
      try { localStorage.setItem(DEMO_KEY, "1"); } catch {}
      setUser({ uid: "demo", name: "Usuario demo", email: "demo@example.com" });
      return;
    }
    const provider = new GoogleAuthProvider();
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const local = /^(localhost|127\.)/.test(window.location.hostname);
    try {
      // En movil y PWA instalada las ventanas emergentes son poco confiables: redireccion.
      if ((standalone || mobile) && !local) await signInWithRedirect(fbAuth(), provider);
      else await signInWithPopup(fbAuth(), provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión");
    }
  }, []);

  const signOut = useCallback(async () => {
    if (IS_DEMO) { try { localStorage.removeItem(DEMO_KEY); } catch {} setUser(null); return; }
    await fbSignOut(fbAuth());
  }, []);

  const getToken = useCallback(async () => (IS_DEMO ? "" : (await fbAuth().currentUser?.getIdToken()) ?? ""), []);

  const value = useMemo(() => ({ user, loading, demo: IS_DEMO, error, signIn, signOut, getToken }), [user, loading, error, signIn, signOut, getToken]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
