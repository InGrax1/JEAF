// Plantilla oficial de la organización para el reporte mensual, transcrita del
// formato que usa la iglesia ("Reporte ofrendas 2026.xlsx"). El formato NO debe
// modificarse: textos, catálogo de conceptos y orden son los del documento
// original. Los datos de la iglesia pueden sobreescribirse por entorno para no
// tener que tocar código si cambia un pastor o un domicilio.

// Encabezado institucional (bloque superior del formato)
const INSTITUCION = {
  linea1: 'MOVIMIENTO DE LA IGLESIA EVANGELICA PENTECOSTÉS DE MÉXICO. A.R.',
  linea2: 'Registro constituido SGAR/171/93          R.F.C IEP930706CH1',
  linea3: 'Dom. conocido S/N Tatxadho, Municipio de Ixmiquilpan Hidalgo C.P. 42321',
  departamento: 'DEPARTAMENTO FISCAL Y CONTABLE',
};

// Datos de la congregación que emite el reporte
const IGLESIA = {
  pastorTitular: process.env.REPORTE_PASTOR_TITULAR || 'LUIS FLORES',
  nombre: process.env.REPORTE_IGLESIA || 'JESUCRISTO EL AMIGO FIEL',
  pastor: process.env.REPORTE_PASTOR || 'JUAN VELAZQUEZ CARRANZA',
  localidad: process.env.REPORTE_LOCALIDAD || 'SANTA ROSA',
  municipio: process.env.REPORTE_MUNICIPIO || 'TEOLOYUCAN',
  estado: process.env.REPORTE_ESTADO || 'MÉXICO',
  telefono: process.env.REPORTE_TELEFONO || 'S/N',
};

// Firmas al pie del formato
const FIRMAS = {
  pastor: { nombre: process.env.REPORTE_PASTOR || 'JUAN VELAZQUEZ CARRANZA', cargo: 'Pastor' },
  tesorera: { nombre: process.env.REPORTE_TESORERA || 'LETICIA ZUÑIGA GARCIA', cargo: 'Tesorera' },
};

// Actividad que el formato asienta en los días con ingreso
const ACTIVIDAD_POR_DEFECTO = 'CULTO RELIGIOSO';

// Columnas fijas de la tabla de ingresos, en el orden del formato
const COLUMNAS_INGRESO = ['OFRENDAS', 'DIEZMOS', 'TALENTOS', 'APORTACIONES'];

// Catálogo fijo de conceptos de egreso, en el orden y con la redacción del formato
const CONCEPTOS_EGRESO = [
  'LUZ',
  'AGUA',
  'TELEFONO',
  'ART. DE LIMPIEZA',
  'IMPUESTO PREDIAL',
  'VÍATICOS',
  'MANT. Y REPARACIÓN DE INSTALACIONES',
  'MANTENIMIENTO Y REPARACIÓN DE VEHICULO',
  'GASTOS DE REPRESENTACIÓN',
  'PAPELERÍA Y UTILES',
  'IMPRENTA',
  'PROPAGANDA Y PUBLICIDAD',
  'AYUDA DE MANUTENCIÓN (DIEZMOS)',
];

// Casilla a la que va a parar lo que no coincide con ninguna equivalencia.
// En egresos, el concepto de cada movimiento en esa casilla usa sus notas
// o, si están vacías, el nombre de la categoría.
const COLUMNA_INGRESO_RESTO = 'APORTACIONES';
const CONCEPTO_EGRESO_RESTO = 'OTROS';

// Quita acentos, signos y mayúsculas para comparar nombres de categoría de
// forma tolerante ("Teléfono", "TELEFONO" y "telefono" son lo mismo).
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Sinónimos categoría de JEAF -> columna fija de ingresos.
// La clave es el nombre normalizado; agregar sinónimos aquí basta para
// que una categoría nueva caiga en la columna correcta. Además de estos,
// una categoría que se llame igual que la casilla del formato se reconoce
// sola (ver EQUIVALENCIAS_INGRESO más abajo).
const ALIAS_INGRESO = {
  ofrenda: 'OFRENDAS',
  ofrendas: 'OFRENDAS',
  'ofrenda general': 'OFRENDAS',
  'ofrenda especial': 'OFRENDAS',
  'ofrenda de culto': 'OFRENDAS',
  diezmo: 'DIEZMOS',
  diezmos: 'DIEZMOS',
  talento: 'TALENTOS',
  talentos: 'TALENTOS',
  aportacion: 'APORTACIONES',
  aportaciones: 'APORTACIONES',
  'pro templo': 'APORTACIONES',
  protemplo: 'APORTACIONES',
};

// Sinónimos categoría de JEAF -> concepto fijo de egresos.
const ALIAS_EGRESO = {
  luz: 'LUZ',
  electricidad: 'LUZ',
  'energia electrica': 'LUZ',
  cfe: 'LUZ',
  agua: 'AGUA',
  telefono: 'TELEFONO',
  internet: 'TELEFONO',
  limpieza: 'ART. DE LIMPIEZA',
  'articulos de limpieza': 'ART. DE LIMPIEZA',
  'art de limpieza': 'ART. DE LIMPIEZA',
  predial: 'IMPUESTO PREDIAL',
  'impuesto predial': 'IMPUESTO PREDIAL',
  viatico: 'VÍATICOS',
  viaticos: 'VÍATICOS',
  mantenimiento: 'MANT. Y REPARACIÓN DE INSTALACIONES',
  instalaciones: 'MANT. Y REPARACIÓN DE INSTALACIONES',
  'mantenimiento de instalaciones': 'MANT. Y REPARACIÓN DE INSTALACIONES',
  'mant y reparacion de instalaciones': 'MANT. Y REPARACIÓN DE INSTALACIONES',
  vehiculo: 'MANTENIMIENTO Y REPARACIÓN DE VEHICULO',
  'mantenimiento de vehiculo': 'MANTENIMIENTO Y REPARACIÓN DE VEHICULO',
  'mantenimiento y reparacion de vehiculo': 'MANTENIMIENTO Y REPARACIÓN DE VEHICULO',
  representacion: 'GASTOS DE REPRESENTACIÓN',
  'gastos de representacion': 'GASTOS DE REPRESENTACIÓN',
  papeleria: 'PAPELERÍA Y UTILES',
  utiles: 'PAPELERÍA Y UTILES',
  'papeleria y utiles': 'PAPELERÍA Y UTILES',
  imprenta: 'IMPRENTA',
  impresion: 'IMPRENTA',
  propaganda: 'PROPAGANDA Y PUBLICIDAD',
  publicidad: 'PROPAGANDA Y PUBLICIDAD',
  'propaganda y publicidad': 'PROPAGANDA Y PUBLICIDAD',
  manutencion: 'AYUDA DE MANUTENCIÓN (DIEZMOS)',
  'ayuda de manutencion': 'AYUDA DE MANUTENCIÓN (DIEZMOS)',
};

// Toda casilla del formato se reconoce por su propio nombre, sin tener que
// repetirla en la lista de sinónimos: así, si en el panel se dan de alta las
// categorías tal como se llaman en la plantilla, el mapeo es directo y no se
// rompe por detalles de escritura (acentos, mayúsculas, puntos o paréntesis
// — "AYUDA DE MANUTENCIÓN (DIEZMOS)" es el caso típico).
const desdeCatalogo = (nombres) =>
  nombres.reduce((acc, n) => ({ ...acc, [normalizar(n)]: n }), {});

const EQUIVALENCIAS_INGRESO = { ...desdeCatalogo(COLUMNAS_INGRESO), ...ALIAS_INGRESO };
const EQUIVALENCIAS_EGRESO = { ...desdeCatalogo(CONCEPTOS_EGRESO), ...ALIAS_EGRESO };

function columnaIngreso(nombreCategoria) {
  return EQUIVALENCIAS_INGRESO[normalizar(nombreCategoria)] || COLUMNA_INGRESO_RESTO;
}

function conceptoEgreso(nombreCategoria) {
  return EQUIVALENCIAS_EGRESO[normalizar(nombreCategoria)] || CONCEPTO_EGRESO_RESTO;
}

module.exports = {
  INSTITUCION,
  IGLESIA,
  FIRMAS,
  ACTIVIDAD_POR_DEFECTO,
  COLUMNAS_INGRESO,
  CONCEPTOS_EGRESO,
  CONCEPTO_EGRESO_RESTO,
  columnaIngreso,
  conceptoEgreso,
  normalizar,
};
