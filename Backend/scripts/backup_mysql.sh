#!/usr/bin/env bash
# ============================================================
# JEAF — Backup diario de MySQL (spec 10.7)
# Dump comprimido con retención de 30 días, pensado para cron:
#   0 3 * * * /ruta/Backend/scripts/backup_mysql.sh >> /var/log/jeaf_backup.log 2>&1
# Variables: toma credenciales del .env del backend o del entorno.
# El destino debe ser almacenamiento frío cifrado (disco/bucket montado).
# Esta política es independiente de la retención de 1 año de logs_auditoria.
# ============================================================
set -euo pipefail

DIR_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$DIR_SCRIPT/../.env}"
DESTINO="${BACKUP_DIR:-$HOME/jeaf_backups}"
RETENCION_DIAS=30

# Cargar credenciales del .env si existe (sin pisar variables ya definidas)
if [[ -f "$ENV_FILE" ]]; then
  while IFS='=' read -r clave valor; do
    [[ "$clave" =~ ^(DB_HOST|DB_PORT|DB_USER|DB_PASSWORD|DB_NAME)$ ]] || continue
    export "$clave"="${!clave:-$valor}"
  done < <(grep -E '^(DB_HOST|DB_PORT|DB_USER|DB_PASSWORD|DB_NAME)=' "$ENV_FILE")
fi

: "${DB_HOST:?Falta DB_HOST}"
: "${DB_USER:?Falta DB_USER}"
: "${DB_NAME:?Falta DB_NAME}"

mkdir -p "$DESTINO"
FECHA="$(date +%Y%m%d_%H%M%S)"
ARCHIVO="$DESTINO/jeaf_${FECHA}.sql.gz"

echo "[jeaf-backup] Iniciando dump de $DB_NAME hacia $ARCHIVO"
MYSQL_PWD="${DB_PASSWORD:-}" mysqldump \
  --host="$DB_HOST" --port="${DB_PORT:-3306}" --user="$DB_USER" \
  --single-transaction --routines --triggers \
  "$DB_NAME" | gzip > "$ARCHIVO"

echo "[jeaf-backup] Dump completado: $(du -h "$ARCHIVO" | cut -f1)"

# Retención: eliminar respaldos con más de RETENCION_DIAS días
find "$DESTINO" -name 'jeaf_*.sql.gz' -mtime +"$RETENCION_DIAS" -delete
echo "[jeaf-backup] Retención aplicada (${RETENCION_DIAS} días). Listo."
