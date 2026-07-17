# JEAF — Manual de Operación del Tesorero

Guía de negocio (spec 9.2) para la operación diaria y el cierre mensual del panel web.

## Acceso

1. Entrar al panel web con tu correo y contraseña.
2. Tu sesión dura 1 hora y se renueva sola mientras trabajas (hasta 7 días). Al terminar, usa **Cerrar sesión**.
3. Si fallas la contraseña 5 veces, el sistema bloquea los intentos por 15 minutos (protección contra ataques).

### ¿Olvidaste tu contraseña?

1. En la pantalla de inicio de sesión, toca **"¿Olvidaste tu contraseña?"**.
2. Escribe tu correo. Si tienes una cuenta, te llegará un **código de 6 dígitos** válido por 15 minutos (revisa spam si no lo ves).
3. Ingresa el código junto con tu nueva contraseña (mínimo 8 caracteres) y confírmala.
4. El código solo sirve una vez y admite máximo 5 intentos — si te equivocas demasiadas veces o se te vence, solicita uno nuevo.

## Operación diaria

### Registrar movimientos
- Los capturistas registran desde el **Atajo de iOS** de su iPhone (ver `Guia_Atajos_iOS.md`).
- Tú también puedes registrar desde tu propio Atajo con tu API Key.
- Cada registro exitoso muestra una notificación con el monto y un **folio** de 6 caracteres.

### Corregir un error (flujo del folio)
1. El capturista te comunica el **folio** que aparece en su notificación.
2. En el panel → **Transacciones**, localiza el registro (puedes filtrar por fecha o categoría).
3. Botón **Cancelar** → escribe la **razón de cancelación** (obligatoria) → confirmar.
4. El registro nunca se borra: queda marcado como cancelado, visible en gris, con rastro completo de quién y por qué lo canceló. Si el movimiento era válido, el capturista lo vuelve a capturar.

### Conciliación bancaria
- En **Transacciones**, marca la casilla **Conciliada** cuando el movimiento aparezca en el estado de cuenta del banco.
- Usa el filtro **Conciliada: No** para ver lo pendiente de conciliar.

## Cierre de mes

1. Concilia todos los movimientos del mes contra el banco.
2. Ve a **Reportes**, elige el mes y descarga:
   - **PDF (cierre formal)**: imprímelo; tiene el espacio reservado para tu firma y la del Pastor/Auditor. Se firma a mano — el sistema no usa firmas electrónicas.
   - **Excel (cruce contable)**: hoja *Detalle* con autofiltro para revisión, hoja *Cancelados* como anexo de auditoría.
3. Las transacciones canceladas **no suman** al cierre; aparecen solo en el anexo con su motivo.

## Administración (solo Tesorero)

### Categorías
- **Categorías** → crear con su tipo (ingreso/egreso). El tipo no puede cambiarse si ya hay movimientos históricos: desactiva la categoría y crea una nueva.
- Desactivar una categoría la quita del menú del Atajo sin afectar el histórico.

### Usuarios
- **Usuarios** → alta con rol único:
  - **Tesorero (super_admin)**: todo el panel + captura móvil.
  - **Auditor**: solo lectura de dashboard, transacciones y reportes.
  - **Auxiliar de Captura**: únicamente el Atajo de iOS; sin acceso al panel.
- La "eliminación" es una baja lógica: el historial de sus capturas se conserva.

### API Keys (Atajos de iOS)
- **API Keys** → **Generar**: elige el usuario y una etiqueta (ej. "iPhone de Juan").
- La key se muestra **una sola vez**: cópiala de inmediato al Atajo del capturista.
- **Si un teléfono se pierde o alguien deja el equipo: botón Revocar** — efecto inmediato, el Atajo deja de funcionar.
- La columna *Último uso* te ayuda a detectar keys inactivas o uso extraño.

## Problemas comunes

| Situación | Qué hacer |
|-----------|-----------|
| El Atajo marca "API Key inválida o revocada" | Genera una key nueva en el panel y actualízala en el Atajo |
| Un capturista registró doble | No suele pasar: los reintentos automáticos no duplican (idempotencia). Si fue captura doble real, cancela una con su folio |
| Se capturó sin señal | El Atajo lo guardó en la app Notas del iPhone; se reintroduce al recuperar señal |
| El dashboard no cuadra con el banco | Revisa el filtro Conciliada: No y el anexo de cancelados del mes |
| Cambio de tesorero | Crea su usuario super_admin, prueba su acceso, y desactiva/elimina el anterior; revoca sus API keys |
