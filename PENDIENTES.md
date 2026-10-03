# Pendientes

Estado al 2 de octubre de 2026. La base funciona en modo demo; este archivo reúne lo que aún no está hecho o no está probado. Cada pendiente se marca al cerrarse y su evidencia se enlaza desde `docs/loops.md`.

## Sin probar (riesgo alto)

- [ ] **Firebase real.** El inicio de sesión con Google, Firestore y las reglas están escritos, pero nunca se han ejecutado contra un proyecto real.
- [ ] **Login en iPhone y Android con la PWA instalada.** Es el riesgo técnico principal del proyecto. La solución prevista es el proxy de `/__/auth` descrito en el README.
- [ ] **Chat con el modelo real.** Solo se ha ejecutado en modo simulado. Falta comprobar la llamada a OpenAI, el formato de salida y el consumo real de tokens.
- [ ] **Identificador y precio del modelo.** Existen GPT-5.6 Luna y GPT-6 Luna con precios distintos según la fuente. El valor correcto se confirma en el panel de OpenAI y se refleja en `OPENAI_MODEL`, `AI_PRICE_IN` y `AI_PRICE_OUT`.

## Decisiones abiertas

- [ ] Hosting para el despliegue. Requisitos: HTTPS, rutas de servidor de Next.js, rewrites, variables secretas y nivel gratuito.
- [ ] Imágenes: generación con IA como último recurso, o solo imágenes con licencia y crédito.
- [ ] Lista definitiva de ubicaciones simuladas (`src/lib/locations.ts`).
- [ ] Cuentas con rol de administrador.

## Configuración

- [ ] Proyecto de Firebase con Authentication (Google) y Firestore.
- [ ] Reglas de `firestore.rules` publicadas.
- [ ] Cuenta de servicio en `FIREBASE_SERVICE_ACCOUNT`.
- [ ] Llave de OpenAI y límite de gasto en el panel del proveedor.
- [ ] Noticias de ejemplo sembradas con `scripts/seed.mjs`.
- [ ] Dominio final agregado a los dominios autorizados de Firebase y a las URI de redirección de OAuth.

## Funcionalidad por construir

### Portal administrativo
- [ ] Búsqueda integrada de imágenes con licencia libre (hoy el portal solo enlaza a Wikimedia Commons y Openverse y acepta una URL).
- [ ] Generación de imagen con IA, si el equipo decide incluirla. La insignia y el campo `origin` ya existen.
- [ ] Carga de imágenes a Firebase Storage.
- [ ] Resumen y temas sugeridos por IA, guardados con `summaryOrigin = "ia"`.
- [ ] Edición de noticias publicadas y cambio de estado de verificación con historial.
- [ ] Vista previa móvil antes de publicar.

### Personalización y feed
- [ ] Más señales de comportamiento: lectura completa y preguntas del chat. Hoy solo se registra la apertura de una noticia.
- [ ] Ajuste de los pesos de la fórmula con pruebas entre compañeros.
- [ ] Pulido visual: jerarquía, estados vacíos, animaciones.

### Chat
- [ ] Caché de respuestas para preguntas repetidas con la misma ubicación.
- [ ] Mejora de la recuperación si el número de noticias crece.

### Costos
- [ ] Medición del costo real por función una vez activo el modelo.
- [ ] Cuentas marcadas como demo que sigan funcionando al alcanzar el tope (hoy el tope apaga la IA para todos).

## Entregables del curso

- [ ] Requerimientos y criterios de aceptación adoptados por el equipo (borrador en el documento de plan).
- [ ] Definición de Done acordada.
- [ ] Tablero de tareas con responsables.
- [ ] Bitácora de engineering loops en `docs/loops.md` (hay una entrada).
- [ ] Evidencia por tarea cerrada: captura, video o salida de prueba.
- [ ] Presentación en el orden de diez puntos del enunciado.
- [ ] Video de respaldo de la demostración.
