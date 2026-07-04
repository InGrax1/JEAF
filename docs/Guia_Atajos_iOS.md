# JEAF — Guía de configuración de los Atajos de iOS

Guía para configurar la captura ultra-rápida de ingresos y gastos desde la pantalla de inicio del iPhone, **sin instalar apps de la App Store** (spec, Módulo de Captura 3.1).

Se crean **2 atajos** en la app **Atajos** (Shortcuts) de iOS: uno para **Ingresos** (icono ⬆️ verde) y otro para **Gastos** (icono ⬇️ rojo).

---

## Requisitos previos

1. El Tesorero genera una **API Key** para el capturista desde el panel web (o vía `POST /api/v1/api-keys`). La key inicia con `jeaf_` y **solo se muestra una vez**: cópiala de inmediato.
2. Conocer la URL base de la API, ej.: `https://api.jeaf.example.com/api/v1`.

---

## Atajo 1: "Registrar Ingreso" ⬆️

Crear un atajo nuevo con estas acciones **en orden**:

### Paso 1 — Solicitar monto
- Acción: **Solicitar entrada** (Ask for Input)
- Tipo: **Número** (activa el teclado numérico nativo)
- Pregunta: `¿Monto del ingreso?`
- Guardar como variable: `Monto`

### Paso 2 — Obtener categorías dinámicas
- Acción: **Obtener contenido de URL** (Get Contents of URL)
  - URL: `https://TU-SERVIDOR/api/v1/categorias?soloActivas=true`
  - Método: `GET`
  - Cabeceras: `X-Api-Key` = `jeaf_...` (tu API key)
- Acción: **Obtener valor del diccionario** → clave `data`
- Acción: **Filtrar archivos** / **Repetir con cada uno**: quedarse con los elementos donde `tipo` = `ingreso` y armar la lista de `nombre`
- Acción: **Elegir de la lista** (Choose from List) → guardar el elemento elegido como `Categoria` (conservar su `id`)

> Alternativa simple: si prefieres no hacer la llamada dinámica, usa **Elegir del menú** con las categorías fijas y pega el `id` (UUID) de cada categoría como valor. Deberás actualizar el atajo si el Tesorero crea categorías nuevas.

### Paso 3 — Notas opcionales
- Acción: **Solicitar entrada** — Tipo: Texto
- Pregunta: `Notas (opcional, ej. "Contado por Juan y Pedro")`
- Permitir vacío. Guardar como `Notas`

### Paso 4 — Generar idempotency_key
- Acción: **Fecha actual** → **Dar formato a fecha**: formato personalizado `yyyyMMddHHmmssSSS` → variable `Timestamp`
- Acción: **Número aleatorio** entre `10000` y `99999` → variable `Aleatorio`
- Acción: **Texto**: `jeaf_XXXX-{Timestamp}-{Aleatorio}` (donde `jeaf_XXXX` son los primeros 8 caracteres de tu API key) → variable `IdempotencyKey`

> Esta key evita duplicados si el atajo reintenta tras un timeout: el servidor detecta la key repetida y responde con la transacción ya existente (spec 10.1).

### Paso 5 — Enviar al servidor
- Acción: **Obtener contenido de URL**
  - URL: `https://TU-SERVIDOR/api/v1/transacciones`
  - Método: `POST`
  - Cabeceras:
    - `X-Api-Key` = `jeaf_...`
    - `Content-Type` = `application/json`
  - Cuerpo de la solicitud (JSON):

```json
{
  "tipo": "ingreso",
  "monto": [Monto],
  "categoriaId": "[id de Categoria]",
  "notas": "[Notas]",
  "idempotencyKey": "[IdempotencyKey]"
}
```

### Paso 6 — Notificación de éxito
- Acción: **Obtener valor del diccionario** de la respuesta → clave `mensaje`
- Acción: **Mostrar notificación**: `[mensaje]`
  - El servidor ya devuelve el texto listo: `Registro exitoso: $150.50 — Folio A1B2C3`

> **Folio de corrección (spec 10.5):** la notificación incluye un folio corto (últimos 6 caracteres del registro). Si el capturista se equivoca, comunica ese folio al Tesorero, quien cancela el registro desde el panel web con motivo obligatorio.

### Paso 7 — Manejo de errores y reintentos (spec 10.2)
Envolver el Paso 5 en la lógica de reintento del propio atajo:

1. Después del POST, acción **Si** (If): la respuesta tiene `ok` = verdadero → continuar al Paso 6.
2. **En caso contrario**: acción **Esperar** 3 segundos → repetir el POST **con la MISMA `IdempotencyKey`** (máximo 2–3 intentos en total).
3. Si todos los intentos fallan (sin señal):
   - Acción: **Mostrar alerta**: `Sin conexión. El registro se guardará en Notas para reingresarlo después.`
   - Acción: **Crear nota** (app Notas) con el contenido: `PENDIENTE JEAF — Monto: [Monto] | Categoría: [Categoria] | Notas: [Notas] | Fecha: [Fecha actual]`

---

## Atajo 2: "Registrar Gasto" ⬇️

Duplicar el Atajo 1 y cambiar únicamente:
- `"tipo": "egreso"` en el cuerpo JSON.
- El filtro de categorías del Paso 2: quedarse con las de `tipo` = `egreso`.
- Pregunta del Paso 1: `¿Monto del gasto?`

---

## Colocar en pantalla de inicio

1. En la app Atajos: mantener presionado el atajo → **Detalles** → **Añadir a pantalla de inicio**.
2. Icono: elegir símbolo/color — verde con flecha arriba para ingresos, rojo con flecha abajo para gastos.

---

## Respuestas del servidor (referencia rápida)

| HTTP | Significado | Acción del capturista |
|------|-------------|----------------------|
| 201 | Registro creado | Nada — notificación de éxito |
| 200 con `duplicada: true` | Reintento detectado, ya existía | Nada — no se duplicó |
| 400 | Datos inválidos (monto ≤ 0, categoría errónea) | Revisar lo capturado |
| 401 | API Key inválida o **revocada** | Avisar al Tesorero |
| 429 | Límite de 30 peticiones/minuto alcanzado | Esperar 1 minuto |

## Seguridad

- La API Key es **personal**: identifica quién hizo cada registro (trazabilidad).
- Si un teléfono se pierde, el Tesorero revoca la key desde el panel con efecto inmediato.
- La key nunca se comparte entre capturistas.
