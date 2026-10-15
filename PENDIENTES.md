# Pendientes

Estado al 14 de octubre de 2026. La infraestructura real ya está montada y probada
(Firebase, despliegue y login en dispositivos). Este archivo lista lo que **aún falta**.
Cada pendiente se marca al cerrarse y su evidencia se enlaza desde `docs/loops.md`.

## Ya resuelto (no tocar, solo referencia)

- Firebase real en el proyecto `p1-rai-santiago`: Authentication con Google y Firestore activos.
- Reglas de `firestore.rules` publicadas y verificadas (el cliente lee `articles`; solo admin escribe).
- 16 noticias de ejemplo sembradas en Firestore y primer usuario con rol admin.
- Login probado en **escritorio** e **iPhone** (PWA instalada). Era el riesgo técnico principal.
- Despliegue en **Vercel**: https://p2rai.vercel.app, con sus variables de entorno de producción.
- Dominio `p2rai.vercel.app` autorizado en Firebase y en el cliente OAuth de Google Cloud
  (`https://p2rai.vercel.app/__/auth/handler`).

## Sin probar / por activar (riesgo alto)

- [x] **Chat con el modelo real.** Activo con Anthropic (`claude-haiku-4-5`, `AI_MOCK=0`) y probado.
- [x] **Identificador y precio del modelo.** `ANTHROPIC_MODEL=claude-haiku-4-5`, `AI_PRICE_IN=1`,
  `AI_PRICE_OUT=5` (USD por millón de tokens). La documentación ya no menciona OpenAI para el chat.
- [ ] **Login en Android (Chrome) con la PWA instalada.** En iPhone ya funciona; falta dejar
  verificado Android.

## Configuración pendiente

- [ ] Llave de Anthropic con **límite de gasto** en su consola (chat).
- [ ] Opcional: llave de OpenRouter (`OPENROUTER_API_KEY`) con límite de crédito, solo para generar imágenes en el
  portal, más `IMAGE_URL_SECRET`. Probar con una imagen y confirmar el costo real en el panel de gasto.
- [ ] **Publicar de nuevo `firestore.rules`** en la consola de Firebase (cambiaron: validación de perfiles,
  eventos y noticias).
- [ ] **Re-sembrar el día de la demo** con `npm run seed` (fechas frescas y URLs de ejemplo `.example`).
- [ ] Acceso compartido del equipo (si se requiere): agregar a los compañeros al proyecto de
  Firebase y al equipo de Vercel `p2-rai`, y pasarles los valores de entorno de forma segura
  (nunca por el repo; p. ej. `vercel env pull`, o compartir `serviceAccount.json` por un canal seguro).
- [ ] Asignar rol admin a las cuentas que lo necesiten (en Firestore sobre `users/{uid}`, tras su
  primer inicio de sesión).

## Decisiones abiertas

- [x] Imágenes: primero búsqueda con licencia (Openverse, gratis, marcada "de archivo"); generación con IA
  como alternativa, siempre como ilustración con sello visible.
- [ ] Lista definitiva de ubicaciones simuladas (`src/lib/locations.ts`).

## Funcionalidad por construir

### Portal administrativo
- [x] Búsqueda integrada de imágenes con licencia libre (Openverse) con vista previa y crédito automático.
- [x] Generación de imagen con IA vía OpenRouter (`openai/gpt-image-1-mini`), guardada en Firestore y servida por
  `/api/images/[id]`. **Sin probar todavía con una llave real.**
- [ ] Carga de archivos propios (Firebase Storage exige plan Blaze; hoy se pega una URL https).
- [ ] Resumen y temas sugeridos por IA, guardados con `summaryOrigin = "ia"`.
- [ ] Edición de noticias publicadas y cambio de estado de verificación con historial.
- [ ] Vista previa móvil antes de publicar.

### Personalización y feed
- [ ] Más señales de comportamiento: lectura completa y preguntas del chat. Hoy solo se registra
  la apertura de una noticia (una vez por noticia y sesión).
- [ ] Ajuste de los pesos de la fórmula con pruebas entre compañeros.
- [ ] Pulido visual: jerarquía, estados vacíos, animaciones.

### Chat
- [ ] Caché de respuestas para preguntas repetidas con la misma ubicación.
- [x] Recuperación: plurales/raíces, intención local/regional/internacional, lugares y gentilicios,
  "no hay noticias sobre <lugar>" cuando corresponde.
- [ ] Mejora de la recuperación si el número de noticias crece.

### Costos
- [ ] Medición del costo real por función una vez activo el modelo.
- [ ] Cuentas marcadas como demo que sigan funcionando al alcanzar el tope (hoy el tope apaga la IA
  para todos).

## Entregables del curso

- [ ] Requerimientos y criterios de aceptación adoptados por el equipo.
- [ ] Definición de Done acordada.
- [ ] Tablero de tareas con responsables.
- [ ] Bitácora de engineering loops en `docs/loops.md` (hay una entrada).
- [ ] Evidencia por tarea cerrada: captura, video o salida de prueba.
- [ ] Presentación en el orden de diez puntos del enunciado.
- [ ] Video de respaldo de la demostración.
