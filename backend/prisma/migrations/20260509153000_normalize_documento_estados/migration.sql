-- R-27: valores de estado fuera del catálogo formal → REGISTRADO
UPDATE `documentos`
SET `estado` = 'REGISTRADO'
WHERE UPPER(TRIM(`estado`)) NOT IN (
  'BORRADOR',
  'REGISTRADO',
  'EN_REVISION',
  'APROBADO',
  'RECHAZADO',
  'ARCHIVADO'
);
