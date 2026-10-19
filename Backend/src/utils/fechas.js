// Conversión UTC <-> zona horaria local de la iglesia (spec 6.1):
// la BD guarda UTC; los límites de mes y el formato de salida usan la
// zona configurada en LOCAL_TIMEZONE. Centralizado aquí, no en clientes.
const env = require('../config/env');
const { AppError } = require('./errors');

/** Día calendario estricto: evita que JavaScript normalice 31 de febrero. */
function esFechaCalendario(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const valor = new Date(`${fecha}T00:00:00Z`);
  return Number.isFinite(valor.getTime()) && valor.toISOString().slice(0, 10) === fecha
    && Number(fecha.slice(0, 4)) >= 1000;
}

function fechaLocalISO(fechaUtc, tz = env.localTimezone) {
  const { anio, mes, dia } = partesLocales(fechaUtc, tz);
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Representación nominal de la hora local, independiente de la zona del servidor.
function instanteLocalNominal(fecha, tz) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(fecha).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return Date.parse(`${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}Z`);
}

/** Cambia solamente el día local; conserva la hora y resuelve el desfase del día destino. */
function cambiarDiaLocal(fechaUtc, fecha, tz = env.localTimezone) {
  if (!esFechaCalendario(fecha)) {
    throw new AppError('La fecha debe ser un día válido en formato AAAA-MM-DD', 400, 'INVALID_DATE');
  }
  const original = new Date(fechaUtc);
  const hora = new Date(instanteLocalNominal(original, tz)).toISOString().slice(11, 19);
  const nominal = Date.parse(`${fecha}T${hora}Z`);
  let candidato = nominal;
  for (let i = 0; i < 4; i += 1) {
    const diferencia = nominal - instanteLocalNominal(new Date(candidato), tz);
    if (diferencia === 0) return new Date(candidato);
    candidato += diferencia;
  }
  throw new AppError('La hora original no existe en ese día por el cambio de horario; elige otra fecha', 400, 'INVALID_LOCAL_TIME');
}

// Desfase (ms) de una zona horaria respecto a UTC en una fecha dada
function offsetMs(fechaUtc, tz) {
  const enUtc = new Date(fechaUtc.toLocaleString('en-US', { timeZone: 'UTC' }));
  const enLocal = new Date(fechaUtc.toLocaleString('en-US', { timeZone: tz }));
  return enLocal.getTime() - enUtc.getTime();
}

/**
 * Rango [desde, hasta) en UTC que corresponde al mes calendario
 * (anio, mes 1-12) en la zona horaria local de la iglesia.
 */
function rangoMesLocal(anio, mes, tz = env.localTimezone) {
  const inicioNominal = new Date(Date.UTC(anio, mes - 1, 1));
  const finNominal = new Date(Date.UTC(anio, mes, 1));
  return {
    desde: new Date(inicioNominal.getTime() - offsetMs(inicioNominal, tz)),
    hasta: new Date(finNominal.getTime() - offsetMs(finNominal, tz)),
  };
}

function formatoLocal(fechaUtc, tz = env.localTimezone) {
  return new Date(fechaUtc).toLocaleString('es-MX', {
    timeZone: tz,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function nombreMes(mes) {
  return new Date(2000, mes - 1, 1).toLocaleDateString('es-MX', { month: 'long' });
}

/**
 * Descompone una fecha UTC en año/mes/día tal como se ven en la zona local de
 * la iglesia. Necesario para asentar cada movimiento en su día correcto del
 * formato oficial: una ofrenda de las 23:00 hora local cae al día siguiente en
 * UTC, y en el reporte debe aparecer en el día en que realmente se recibió.
 */
function partesLocales(fechaUtc, tz = env.localTimezone) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(new Date(fechaUtc))
    .reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return { anio: Number(partes.year), mes: Number(partes.month), dia: Number(partes.day) };
}

/** Fecha corta dd/mm/aaaa en hora local (formato de la columna FECHA del reporte) */
function formatoFechaCorta(fechaUtc, tz = env.localTimezone) {
  const { anio, mes, dia } = partesLocales(fechaUtc, tz);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;
}

module.exports = {
  esFechaCalendario,
  fechaLocalISO,
  cambiarDiaLocal,
  rangoMesLocal,
  formatoLocal,
  nombreMes,
  offsetMs,
  partesLocales,
  formatoFechaCorta,
};
