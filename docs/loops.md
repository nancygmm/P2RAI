# Bitácora de engineering loops

Cada ciclo de trabajo ocupa una entrada. Desde aquí se enlazan los prompts usados con asistentes de IA y la evidencia de cada ciclo (captura, video o salida de prueba).

## Plantilla

- **Fecha / responsable:**
- **Qué se quería entender:**
- **Hipótesis:**
- **Qué se construyó:**
- **Cómo se probó:**
- **Qué se observó:**
- **Qué se cambió:**
- **Evidencia:**

## Loop 1 · El cupo internacional no se cumplía (2026-10-02)

- **Qué se quería entender:** si los primeros ocho puestos del feed incluyen siempre una noticia local, una nacional y una internacional.
- **Hipótesis:** bastaba con tratar como "internacional" cualquier noticia con coincidencia geográfica menor o igual a 0.3.
- **Qué se construyó:** `rankFeed` con cupos reservados y `scripts/test-relevance.ts`.
- **Cómo se probó:** `npm test` imprime los ocho primeros puestos para cinco ubicaciones.
- **Qué se observó:** la prueba pasaba, pero desde Ciudad de Guatemala los ocho primeros puestos no tenían ninguna noticia internacional. La noticia regional centroamericana, con coincidencia 0.3, ocupaba ese cupo.
- **Qué se cambió:** el grupo internacional exige ahora ámbito internacional o coincidencia estrictamente menor a 0.3. La cumbre climática sube al puesto 8 con la etiqueta "Para que no te lo pierdas: internacional".
- **Lección:** la prueba verificaba la regla tal como estaba escrita, no su intención. La salida impresa reveló el fallo que el "OK" ocultaba.
