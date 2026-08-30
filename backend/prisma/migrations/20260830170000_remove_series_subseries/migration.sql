-- Retiro de Series/Subseries: se elimina solo la clasificación archivística.
-- Los documentos, archivos, eventos, ACL, usuarios y catálogos restantes se conservan.
-- Conteo previo en desarrollo local (2026-08-30): 14 documentos, 3 series, 1 subserie.

-- 1) Quitar FK Documento → Subserie e índice asociado
ALTER TABLE `documentos` DROP FOREIGN KEY `documentos_subserie_id_fkey`;

DROP INDEX `documentos_subserie_id_idx` ON `documentos`;

-- 2) Quitar columna de clasificación (no recrea la tabla documentos)
ALTER TABLE `documentos` DROP COLUMN `subserie_id`;

-- 3) Quitar catálogo Subserie → Serie
ALTER TABLE `subseries` DROP FOREIGN KEY `subseries_serie_id_fkey`;

DROP TABLE `subseries`;

DROP TABLE `series`;

-- 4) Permisos RBAC de catálogos retirados (no se reutilizan)
DELETE `rp` FROM `role_permissions` `rp`
INNER JOIN `permissions` `p` ON `p`.`id` = `rp`.`permission_id`
WHERE `p`.`codigo` IN ('SERIES_WRITE', 'SUBSERIES_WRITE');

DELETE `up` FROM `user_permissions` `up`
INNER JOIN `permissions` `p` ON `p`.`id` = `up`.`permission_id`
WHERE `p`.`codigo` IN ('SERIES_WRITE', 'SUBSERIES_WRITE');

DELETE FROM `permissions` WHERE `codigo` IN ('SERIES_WRITE', 'SUBSERIES_WRITE');
