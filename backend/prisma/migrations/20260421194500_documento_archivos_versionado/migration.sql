-- AlterTable
ALTER TABLE `documento_archivos` ADD COLUMN `version` INT NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX `documento_archivos_documento_id_original_name_version_key` ON `documento_archivos`(`documento_id`, `original_name`, `version`);

