-- Dependencia propietaria del documento + nivel de confidencialidad (gap 28 R-6/R-38).

ALTER TABLE `documentos`
  ADD COLUMN `dependencia_id` VARCHAR(191) NULL,
  ADD COLUMN `nivel_confidencialidad` VARCHAR(32) NOT NULL DEFAULT 'INTERNO';

CREATE INDEX `documentos_dependencia_id_idx` ON `documentos`(`dependencia_id`);
CREATE INDEX `documentos_nivel_confidencialidad_idx` ON `documentos`(`nivel_confidencialidad`);

ALTER TABLE `documentos`
  ADD CONSTRAINT `documentos_dependencia_id_fkey`
  FOREIGN KEY (`dependencia_id`) REFERENCES `dependencias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Propietario por defecto: dependencia del creador del documento (si existe).
UPDATE `documentos` d
INNER JOIN `users` u ON u.id = d.created_by_id
SET d.`dependencia_id` = u.`dependencia_id`
WHERE d.`dependencia_id` IS NULL AND u.`dependencia_id` IS NOT NULL;
