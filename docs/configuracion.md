# Configuración y variables de entorno

Guía para que cualquier integrante **reproduzca el entorno** (local y en Vercel) sin exponer
secretos. El backend es **uno solo y compartido** por el equipo: el mismo proyecto de Firebase
(`p1-rai-santiago`) y el mismo despliegue en Vercel (`p2-rai/p2rai` → https://p2rai.vercel.app).
No hace falta que cada quien cree su propio proyecto.

> Regla de oro: **ningún secreto se sube al repo.** `.env.local`, `serviceAccount.json` y `.vercel/`
> están en `.gitignore`. En el repo solo vive `.env.example` (plantilla vacía).

---

## 1. Variables de entorno

| Variable                            | ¿Secreto?    | Para qué                                                         | De dónde sale                                                                                                                                                       |
| ----------------------------------- | ------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`    | No (pública) | Config del cliente Firebase                                       | Consola Firebase → ⚙️ Configuración del proyecto → Tus apps → SDK setup                                                                                        |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | No (pública) | Config del cliente Firebase                                       | Igual que arriba (`projectId`)                                                                                                                                     |
| `NEXT_PUBLIC_FIREBASE_APP_ID`     | No (pública) | Config del cliente Firebase                                       | Igual que arriba (`appId`)                                                                                                                                         |
| `FIREBASE_SERVICE_ACCOUNT`        | **SÍ** | Admin SDK en el servidor (verifica tokens, rutas`/api/*`, seed) | Consola Firebase → Configuración → Cuentas de servicio → Generar nueva clave privada (JSON). Se guarda en`.env.local` **en base64 o en una sola línea** |
| `OPENAI_API_KEY`                  | **SÍ** | Llamadas al modelo (chat IA)                                      | Panel de OpenAI. Ponerle**límite de gasto**                                                                                                                   |
| `OPENAI_MODEL`                    | No            | Identificador del modelo                                          | Panel de OpenAI (hoy`gpt-5.6-luna` es *placeholder*, confirmar)                                                                                                  |
| `AI_PRICE_IN` / `AI_PRICE_OUT`  | No            | Precio USD por 1M tokens, para calcular el gasto                  | Panel de OpenAI                                                                                                                                                      |
| `AI_MOCK`                         | No            | `1` = chat sin IA (modo simulado); `0` = IA real              | Decisión del equipo                                                                                                                                                 |
| `AI_BUDGET_CAP_USD`               | No            | Tope de gasto (default 14; reserva 20 − tope)                    | Decisión del equipo                                                                                                                                                 |
| `CHAT_DAILY_LIMIT`                | No            | Preguntas de chat por usuario al día (default 30)                | Decisión del equipo                                                                                                                                                 |

Las `NEXT_PUBLIC_*` son **públicas por diseño** (viajan al navegador); no son un secreto, pero por
limpieza tampoco las fijamos en el código: se leen de la consola de Firebase o se bajan con
`vercel env pull` (ver abajo). Son **las mismas para todo el equipo**.

Qué hay hoy configurado en Vercel (producción): las 3 `NEXT_PUBLIC_*`, `FIREBASE_SERVICE_ACCOUNT`
(como *secret*) y `AI_MOCK=1`. Las de OpenAI quedan pendientes.

---

## 2. Camino rápido para el equipo (recomendado)

Si ya te agregaron al **equipo de Vercel `p2-rai`** y al **proyecto de Firebase**, no copias nada a
mano:

```bash
npx vercel login
npx vercel link --yes --project p2rai --scope p2-rai

npx vercel env pull .env.local --environment=production --scope p2-rai
```

Ojo: `vercel env pull` **no** baja los valores marcados como *secret* (`FIREBASE_SERVICE_ACCOUNT`,
y luego `OPENAI_API_KEY`). Para esos, ver la sección 4 (compartir secretos).

Para correr:

```bash
npm install
npm run dev      
```

> Sin ningún `.env.local`, la app corre en **modo demo** (datos de ejemplo, sin Firebase ni IA):
> suficiente para trabajar solo la interfaz.

---

## 3. Configurar las variables en Vercel (desde cero o para un deploy nuevo)

El CLI de Vercel tiene dos detalles que conviene conocer (los vivimos en el setup):

- Una variable con prefijo `NEXT_PUBLIC_` que "parece credencial" exige elegir tipo explícito:
  usar `--type config` (es pública por diseño).
- Pasar el valor con `--value` (y `--yes`) es más confiable que por `stdin`.

Comandos que funcionan (ajusta `--scope` si tu equipo es otro):

```bash
npx vercel env add NEXT_PUBLIC_FIREBASE_API_KEY     production --type config --value "<API_KEY>"     --yes --scope p2-rai
npx vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID  production --type config --value "<PROJECT_ID>"  --yes --scope p2-rai
npx vercel env add NEXT_PUBLIC_FIREBASE_APP_ID      production --type config --value "<APP_ID>"      --yes --scope p2-rai
npx vercel env add AI_MOCK                          production --type config --value "1"             --yes --scope p2-rai

npx vercel env add FIREBASE_SERVICE_ACCOUNT         production --type secret --value "<BASE64_DEL_JSON>" --yes --scope p2-rai

npx vercel env add OPENAI_API_KEY                   production --type secret --value "<OPENAI_KEY>"  --yes --scope p2-rai
npx vercel env add OPENAI_MODEL                     production --type config --value "<modelo>"      --yes --scope p2-rai
npx vercel env add AI_PRICE_IN                      production --type config --value "<precio_in>"   --yes --scope p2-rai
npx vercel env add AI_PRICE_OUT                     production --type config --value "<precio_out>"  --yes --scope p2-rai
# y cambiar AI_MOCK a 0 (rm + add, o desde el dashboard)
```

También se pueden agregar desde el **dashboard**: Project → Settings → Environment Variables.

Después de cambiar variables, **re-desplegar** para que tomen efecto:

```bash
npx vercel --prod --yes --scope p2-rai
```

Las `NEXT_PUBLIC_*` se "hornean" en el build, así que deben existir **antes** de desplegar.

---

## 4. Compartir los secretos de forma segura

Nunca por el repo ni por chat público. Opciones:

- **`FIREBASE_SERVICE_ACCOUNT`**: cada integrante puede **generar su propia clave** de cuenta de
  servicio desde el mismo proyecto Firebase (Configuración → Cuentas de servicio → Generar clave).
  No hace falta compartir la misma. Para convertir el JSON a una línea base64:
  ```bash
  base64 -i serviceAccount.json | tr -d '\n'
  ```

  y pegar el resultado como valor de `FIREBASE_SERVICE_ACCOUNT` en `.env.local`.
- **`OPENAI_API_KEY`**: compartir por un canal seguro (gestor de contraseñas del equipo), o que el
  responsable de la Fase C la cargue solo en Vercel. Siempre con **límite de gasto** en el panel.

---

## 5. Dar acceso a un integrante nuevo

1. **Firebase**: Consola → ⚙️ Configuración del proyecto → Usuarios y permisos → agregar su correo.
2. **Vercel**: invitarlo al equipo `p2-rai`.
3. **Rol admin del portal** (si lo necesita): que inicie sesión una vez en la app y luego, en
   Firestore, poner `role: "admin"` en su documento `users/{uid}`. Las reglas impiden auto-asignarse
   el rol; se hace a mano en la consola.
4. Reproduce su entorno local con la **sección 2**.

---

## 6. Autorización de dominios (ya hecho para `p2rai.vercel.app`)

Para que el login con Google funcione en un dominio, ese dominio debe estar en **dos** lugares
(si se agrega un dominio nuevo, repetir):

- Firebase → Authentication → Settings → **Dominios autorizados**.
- Google Cloud → APIs y servicios → Credenciales → cliente OAuth web → **URI de redirección**:
  `https://<dominio>/__/auth/handler`, y **Orígenes de JavaScript**: `https://<dominio>`.

Esto **no genera cobros**.
