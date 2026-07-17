# JEAF — Guía de Despliegue y Entornos

Estrategia de la especificación (10.6): **dev (local) → staging (Render) → producción (Render + Vercel)**.

## Entornos

| Entorno | Backend | Frontend | Base de datos | Se despliega… |
|---------|---------|----------|---------------|----------------|
| dev | `npm run dev` local | `npm run dev` local | MySQL local (`jeaf`) | manual |
| staging | Render (servicio staging) | Vercel (preview) | MySQL separada (Aiven, BD `jeaf_staging`) | automático al merge a `develop` |
| producción | Render (servicio prod) | Vercel (production) | Aiven MySQL (`jeaf`) | solo con tag `v*` (release manual) |

## 1. Base de datos (Aiven MySQL)

1. Crear servicio MySQL en [Aiven](https://aiven.io) (plan con **point-in-time recovery** — confirmar que la retención esté incluida, spec 10.7).
2. Crear las bases `jeaf` (prod) y `jeaf_staging`.
3. Aplicar `Backend/database/schema.sql` y `Backend/database/seed.sql` a cada una (ajustando el `USE`).
4. Cambiar de inmediato la contraseña del usuario seed `tesorero@jeaf.local`.

## 2. Backend en Render

1. **New → Web Service**, conectar el repositorio de GitHub.
2. Configuración:
   - Root Directory: `Backend`
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Health Check Path: `/api/v1/health` (uptime monitoring, KPI > 99.9%)
3. Variables de entorno (Environment): todas las de `Backend/.env.example` con valores reales — en particular:
   - `NODE_ENV=production` (HTTPS lo termina Render; `trust proxy` ya está configurado)
   - `CORS_ORIGINS=https://tu-panel.vercel.app` (solo orígenes autorizados)
   - Credenciales de Aiven (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)
   - Secretos JWT largos y aleatorios, **distintos** de los de staging
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` — **obligatorias en producción** para la recuperación de contraseña (spec: código por correo). Sin ellas, `POST /auth/olvide-password` responde `500`. Con Gmail: host `smtp.gmail.com`, puerto `587`, y una [contraseña de aplicación](https://myaccount.google.com/apppasswords) (no la contraseña normal de la cuenta)
4. Crear **dos servicios** (staging apuntando a `develop`, producción a `main`) y copiar el **Deploy Hook** de cada uno (Settings → Deploy Hook) a los secretos de GitHub:
   - `RENDER_STAGING_DEPLOY_HOOK`
   - `RENDER_PROD_DEPLOY_HOOK`

## 3. Frontend en Vercel

1. **Import Project**, Root Directory: `Frontend` (el `vercel.json` ya maneja las rutas de la SPA).
2. Variable de entorno: `VITE_API_URL=https://TU-BACKEND.onrender.com/api/v1` (distinta por entorno: Production/Preview).
3. Production Branch: `main`. Los merges a `develop` generan Preview Deployments (staging).

## 4. CI/CD (GitHub Actions)

Ya configurado en `.github/workflows/ci.yml`:

- **Cada push/PR a `main` o `develop`**: pruebas unitarias, pruebas de integración contra MySQL 8 real (contenedor de servicio) y build del frontend.
- **Push/merge a `develop`**: si las pruebas pasan, dispara el deploy hook de staging.
- **Tag `v*`** (ej. `git tag v1.0.0 && git push --tags`): dispara el deploy de producción.

## 5. Backup (spec 10.7)

- **Primera línea**: point-in-time recovery de Aiven (incluido en el plan).
- **Respaldo adicional**: dump diario con `Backend/scripts/backup_mysql.sh` (gzip, retención 30 días) hacia almacenamiento frío cifrado. Programar con cron en un host propio o como Cron Job de Render:
  ```
  0 3 * * *  BACKUP_DIR=/ruta/cifrada /opt/jeaf/Backend/scripts/backup_mysql.sh
  ```
- Esta política es independiente de la retención de 1 año de `logs_auditoria` (auditoría ≠ recuperación ante desastres).

## 6. Checklist de puesta en producción

- [ ] Contraseña del Tesorero seed cambiada.
- [ ] Secretos JWT únicos por entorno (nunca los del `.env.example`).
- [ ] `CORS_ORIGINS` limitado al dominio real del panel.
- [ ] HTTPS verificado extremo a extremo (Render y Vercel lo dan por defecto).
- [ ] Health check configurado y monitoreado (UptimeRobot o similar contra `/api/v1/health`).
- [ ] API Keys de capturistas generadas desde el panel y Atajos configurados (ver `docs/Guia_Atajos_iOS.md`).
- [ ] Backup diario programado y probado (restaurar un dump en staging al menos una vez).
- [ ] `SMTP_*` configurado en Render y probado con un "olvidé mi contraseña" real (revisar que el correo llegue, incluida la carpeta de spam).
- [ ] UAT con el tesorero real: capturar, cancelar con folio, conciliar, descargar el cierre del mes y recuperar contraseña.
