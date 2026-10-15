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

  // Cabeceras de seguridad. Se excluye /__/auth/*: lo sirve Firebase y su iframe debe poder
  // cargarse dentro de la app. SAMEORIGIN (no DENY) por la misma razon.
  async headers() {
    return [
      {
        source: "/:path((?!__/auth).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // La ubicacion es simulada: la app nunca pide el GPS.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
