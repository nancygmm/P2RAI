# P2RAI · AI Assisted News App

Proyecto 2 del curso Responsible AI: una PWA de noticias personalizadas con portal administrativo.
Un solo proyecto Next.js sirve la aplicación móvil (`/`, `/feed`, `/noticia/[id]`) y el portal (`/admin`).

Lo que falta por hacer está en [PENDIENTES.md](PENDIENTES.md).

## Arranque en modo demo

El proyecto arranca sin configuración previa:

```bash
npm install
npm run dev        # http://localhost:3000
```

Cuando no existe `.env.local`, la aplicación corre en **modo demo**: usa noticias de ejemplo ficticias,
una sesión simulada y datos guardados en `localStorage`, y el chat responde sin llamar al modelo.
Este modo permite trabajar la interfaz sin gastar créditos.

Otros comandos disponibles:

```bash
npm test           # pruebas de relevancia, validación y recuperación
npm run build      # compilación de producción
```

## Configuración real

La configuración completa consta de siete pasos:

1. **Firebase.** El proyecto requiere Authentication con el proveedor Google y Firestore.
2. **Variables de cliente.** `.env.example` se copia a `.env.local` y se completan las variables `NEXT_PUBLIC_FIREBASE_*`.
3. **Cuenta de servicio.** La clave se genera en Configuración del proyecto → Cuentas de servicio. El JSON va en una
   sola línea en `FIREBASE_SERVICE_ACCOUNT` y nunca se sube al repositorio.
4. **Reglas.** `firestore.rules` se publica desde la consola o con `firebase deploy --only firestore:rules`.
5. **Datos de ejemplo.** Se siembran con `node --env-file=.env.local scripts/seed.mjs`.
6. **Administrador.** Tras el primer inicio de sesión, el rol se asigna en la consola de Firestore agregando
   `role: "admin"` al documento `users/{uid}`. Las reglas impiden que una cuenta se asigne el rol desde la aplicación.
7. **OpenAI.** La llave va en `OPENAI_API_KEY`. `OPENAI_MODEL`, `AI_PRICE_IN` y `AI_PRICE_OUT` deben coincidir con el
   panel de OpenAI, y `AI_MOCK=0` activa las llamadas reales. Conviene fijar además un límite de gasto en ese panel.

## Login en iPhone y PWA instalada

Los navegadores bloquean el almacenamiento de terceros, lo que rompe `signInWithRedirect` con la configuración
por defecto. En este proyecto `authDomain` es el dominio propio de la aplicación y `next.config.ts` reenvía
`/__/auth/*` a `<proyecto>.firebaseapp.com` ([guía de Firebase, opción 3](https://firebase.google.com/docs/auth/web/redirect-best-practices)).

Al desplegar, el dominio final debe figurar en dos lugares:
- Firebase → Authentication → Settings → Dominios autorizados.
- Google Cloud → Credenciales → cliente OAuth web → URI de redirección: `https://<dominio>/__/auth/handler`.

Este flujo aún no se ha probado en dispositivos reales.

## Dónde está cada decisión de Responsible AI

| Pregunta del enunciado | Archivo |
| --- | --- |
| Orden y prominencia del feed, cupos contra la burbuja | `src/lib/relevance.ts` |
| Regla de validación de fuentes | `src/lib/validation.ts` |
| Recuperación para el chat (sin IA) | `src/lib/retrieval.ts` |
| Chat: citas validadas, incertidumbre, "no sé" | `src/app/api/chat/route.ts` |
| Tope de gasto, registro de costos, único acceso a la IA | `src/lib/ai.ts` |
| Etiquetas de verificación e insignia de imagen generada | `src/components/Badges.tsx` |
| Permisos | `firestore.rules` |

## Qué incluye la base

- Inicio de sesión con Google y modo demo.
- Ubicación simulada que reordena el feed al cambiarla.
- Feed con tres niveles de prominencia y la razón por la que aparece cada noticia.
- Lectura con fuentes, estado de verificación y origen del resumen.
- Chat temporal con citas a las noticias publicadas.
- Publicación desde el portal con validación de fuentes.
- Registro de gasto de IA con tope configurable.
- PWA instalable en iPhone y Android.
