# Pendientes

Estado al 4 de octubre de 2026. La infraestructura real ya está montada y probada
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

- [ ] **Chat con el modelo real.** Hoy corre en modo extractivo (sin IA), tanto local como en
  producción. Falta activar la llamada a OpenAI (`AI_MOCK=0`), comprobar el formato de salida y
  el consumo real de tokens.
- [ ] **Identificador y precio del modelo.** `OPENAI_MODEL` trae `gpt-5.6-luna` como *placeholder*.
  Confirmar el valor real y reflejarlo en `OPENAI_MODEL`, `AI_PRICE_IN` y `AI_PRICE_OUT`.
- [ ] **Login en Android (Chrome) con la PWA instalada.** En iPhone ya funciona; falta dejar
  verificado Android.

## Configuración pendiente

- [ ] Llave de OpenAI con **límite de gasto** en el panel del proveedor; agregarla a `.env.local`
  y a las variables de entorno de Vercel (producción).
- [ ] Acceso compartido del equipo (si se requiere): agregar a los compañeros al proyecto de
  Firebase y al equipo de Vercel `p2-rai`, y pasarles los valores de entorno de forma segura
  (nunca por el repo; p. ej. `vercel env pull`, o compartir `serviceAccount.json` por un canal seguro).
- [ ] Asignar rol admin a las cuentas que lo necesiten (en Firestore sobre `users/{uid}`, tras su
  primer inicio de sesión).

## Decisiones abiertas

- [ ] Imágenes: generación con IA como último recurso, o solo imágenes con licencia y crédito.
- [ ] Lista definitiva de ubicaciones simuladas (`src/lib/locations.ts`).

## Funcionalidad por construir

### Portal administrativo
- [ ] Búsqueda integrada de imágenes con licencia libre (hoy el portal solo enlaza a Wikimedia
  Commons y Openverse y acepta una URL).
- [ ] Generación de imagen con IA, si el equipo decide incluirla. La insignia y el campo `origin` ya existen.
- [ ] Carga de imágenes a Firebase Storage.
- [ ] Resumen y temas sugeridos por IA, guardados con `summaryOrigin = "ia"`.
- [ ] Edición de noticias publicadas y cambio de estado de verificación con historial.
- [ ] Vista previa móvil antes de publicar.

### Personalización y feed
- [ ] Más señales de comportamiento: lectura completa y preguntas del chat. Hoy solo se registra
  la apertura de una noticia.
- [ ] Ajuste de los pesos de la fórmula con pruebas entre compañeros.
- [ ] Pulido visual: jerarquía, estados vacíos, animaciones.

### Chat
- [ ] Caché de respuestas para preguntas repetidas con la misma ubicación.
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
