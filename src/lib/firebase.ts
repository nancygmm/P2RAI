"use client";
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

/** Sin configuracion de Firebase la app corre en modo demo con datos locales. */
export const IS_DEMO = !apiKey || !projectId;

function authDomain(): string {
  // En produccion el authDomain es el dominio propio: next.config.ts reenvia
  // /__/auth/* a firebaseapp.com, asi el login por redireccion funciona en
  // Safari y en la PWA instalada. En localhost se usa el dominio de Firebase.
  if (typeof window !== "undefined" && !/^(localhost|127\.|192\.168\.)/.test(window.location.hostname)) {
    return window.location.host;
  }
  return `${projectId}.firebaseapp.com`;
}

let app: FirebaseApp | null = null;
function getApp(): FirebaseApp {
  if (IS_DEMO) throw new Error("Firebase no esta configurado (modo demo)");
  app ??= getApps()[0] ?? initializeApp({ apiKey, projectId, appId, authDomain: authDomain() });
  return app;
}

export const fbAuth = (): Auth => getAuth(getApp());
export const fbDb = (): Firestore => getFirestore(getApp());
