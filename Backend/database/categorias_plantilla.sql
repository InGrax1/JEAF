-- ------------------------------------------------------------
-- Conceptos de egreso del formato oficial de la organización
-- (el mismo catálogo que trae la plantilla en Excel de la iglesia).
--
-- Para qué sirve: con estos nombres exactos, el reporte mensual en PDF
-- coloca cada gasto solo en su casilla del formato, sin que nada caiga en
-- "OTROS" (ver Backend/src/config/plantillaReporte.js).
--
-- Cómo usarlo en producción:
--   mysql -h <host> -u <usuario> -p <base_de_datos> < categorias_plantilla.sql
-- o pegando el contenido en MySQL Workbench sobre la base de producción.
--
-- Es idempotente: se puede ejecutar varias veces sin duplicar nada, y no
-- toca las categorías que ya existan con esos nombres.
--
-- Nota: no incluye "OTROS". Esa casilla del formato no es una categoría; es
-- el destino de lo que no coincide con el catálogo, y el reporte imprime ahí
-- el nombre real de la categoría (p. ej. "OTROS: Servicios").
-- ------------------------------------------------------------

INSERT INTO categorias (id, nombre, tipo) VALUES
  ('c0000000-0000-4000-8000-000000000006', 'LUZ',                                    'egreso'),
  ('c0000000-0000-4000-8000-000000000007', 'AGUA',                                   'egreso'),
  ('c0000000-0000-4000-8000-000000000008', 'TELEFONO',                               'egreso'),
  ('c0000000-0000-4000-8000-000000000009', 'ART. DE LIMPIEZA',                       'egreso'),
  ('c0000000-0000-4000-8000-00000000000a', 'IMPUESTO PREDIAL',                       'egreso'),
  ('c0000000-0000-4000-8000-00000000000b', 'VÍATICOS',                               'egreso'),
  ('c0000000-0000-4000-8000-00000000000c', 'MANT. Y REPARACIÓN DE INSTALACIONES',    'egreso'),
  ('c0000000-0000-4000-8000-00000000000d', 'MANTENIMIENTO Y REPARACIÓN DE VEHICULO', 'egreso'),
  ('c0000000-0000-4000-8000-00000000000e', 'GASTOS DE REPRESENTACIÓN',               'egreso'),
  ('c0000000-0000-4000-8000-00000000000f', 'PAPELERÍA Y UTILES',                     'egreso'),
  ('c0000000-0000-4000-8000-000000000010', 'IMPRENTA',                               'egreso'),
  ('c0000000-0000-4000-8000-000000000011', 'PROPAGANDA Y PUBLICIDAD',                'egreso'),
  ('c0000000-0000-4000-8000-000000000012', 'AYUDA DE MANUTENCIÓN (DIEZMOS)',         'egreso')
ON DUPLICATE KEY UPDATE tipo = VALUES(tipo);
