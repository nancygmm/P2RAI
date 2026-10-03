"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  addDoc, collection, doc, increment, limit, onSnapshot, orderBy, query, setDoc,
} from "firebase/firestore";
import { IS_DEMO, fbDb } from "./firebase";
import { DEFAULT_LOCATION_ID, getLocation } from "./locations";
import { seedArticles } from "./seed";
import type { Affinity, Article, SimLocation } from "./types";
import { useAuth } from "@/components/AuthProvider";

interface Store {
  articles: Article[];
  ready: boolean;
  location: SimLocation;
  affinity: Affinity;
  isAdmin: boolean;
  setLocation: (id: string) => void;
  /** Senal de comportamiento: abrir una noticia sube la afinidad con sus temas. */
  trackOpen: (a: Article) => void;
  publish: (a: Omit<Article, "id">) => Promise<void>;
  /** Solo demo: noticias publicadas localmente, para enviarlas al chat. */
  demoArticles: Article[];
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore fuera de StoreProvider");
  return c;
};

const K = { loc: "p2rai_loc", aff: "p2rai_aff", arts: "p2rai_articles" };
const read = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [demoArticles, setDemoArticles] = useState<Article[]>([]);
  const [ready, setReady] = useState(false);
  const [locationId, setLocationId] = useState(DEFAULT_LOCATION_ID);
  const [affinity, setAffinity] = useState<Affinity>({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setReady(false); return; }
    if (IS_DEMO) {
      const local = read<Article[]>(K.arts, []);
      setDemoArticles(local);
      setArticles([...local, ...seedArticles()]);
      setLocationId(read(K.loc, DEFAULT_LOCATION_ID));
      setAffinity(read(K.aff, {}));
      setIsAdmin(true);
      setReady(true);
      return;
    }
    const db = fbDb();
    const unsubA = onSnapshot(
      query(collection(db, "articles"), orderBy("publishedAt", "desc"), limit(100)),
      (snap) => { setArticles(snap.docs.map((d) => ({ ...(d.data() as Omit<Article, "id">), id: d.id }))); setReady(true); },
      (e) => { console.error(e); setReady(true); },
    );
    const unsubU = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const d = snap.data();
      setLocationId(d?.locationId ?? DEFAULT_LOCATION_ID);
      setAffinity(d?.topicAffinity ?? {});
      setIsAdmin(d?.role === "admin");
    });
    return () => { unsubA(); unsubU(); };
  }, [user]);

  const setLocation = useCallback((id: string) => {
    setLocationId(id);
    if (IS_DEMO) return write(K.loc, id);
    if (user) setDoc(doc(fbDb(), "users", user.uid), { locationId: id }, { merge: true }).catch(console.error);
  }, [user]);

  const trackOpen = useCallback((a: Article) => {
    if (IS_DEMO) {
      setAffinity((prev) => {
        const next = { ...prev };
        for (const t of a.topics) next[t] = (next[t] ?? 0) + 1;
        write(K.aff, next);
        return next;
      });
      return;
    }
    if (!user) return;
    const db = fbDb();
    const topicAffinity = Object.fromEntries(a.topics.map((t) => [t, increment(1)]));
    setDoc(doc(db, "users", user.uid), { topicAffinity }, { merge: true }).catch(console.error);
    addDoc(collection(db, "events"), { uid: user.uid, articleId: a.id, type: "abrir", ts: Date.now() }).catch(console.error);
  }, [user]);

  const publish = useCallback(async (a: Omit<Article, "id">) => {
    if (IS_DEMO) {
      const art: Article = { ...a, id: `local-${Date.now()}` };
      setDemoArticles((prev) => { const next = [art, ...prev]; write(K.arts, next); return next; });
      setArticles((prev) => [art, ...prev]);
      return;
    }
    await addDoc(collection(fbDb(), "articles"), a);
  }, []);

  const value = useMemo(() => ({
    articles, ready, location: getLocation(locationId), affinity, isAdmin, setLocation, trackOpen, publish, demoArticles,
  }), [articles, ready, locationId, affinity, isAdmin, setLocation, trackOpen, publish, demoArticles]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
