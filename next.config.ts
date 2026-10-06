import type { NextConfig } from "next";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],

  // Proxy del helper de Firebase Auth al dominio propio. Evita que el login por
  // redireccion falle en navegadores que bloquean almacenamiento de terceros
  // (Safari / PWA instalada en iPhone). Ver README, seccion "Login".
  async rewrites() {
    if (!projectId) return [];
    return [
      {
        source: "/__/auth/:path*",
        destination: `https://${projectId}.firebaseapp.com/__/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
