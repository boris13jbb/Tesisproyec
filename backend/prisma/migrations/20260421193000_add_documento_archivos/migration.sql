-- CreateTable
CREATE TABLE `documento_archivos` (
  `id` VARCHAR(36) NOT NULL,
  `documento_id` VARCHAR(191) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `stored_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(127) NOT NULL,
  `size_bytes` INT NOT NULL,
  `sha256` VARCHAR(64) NOT NULL,
  `path_rel` VARCHAR(500) NOT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  `created_by_id` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `documento_archivos_documento_id_idx` (`documento_id`),
  INDEX `documento_archivos_created_by_id_idx` (`created_by_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documento_archivo_eventos` (
  `id` VARCHAR(36) NOT NULL,
  `documento_archivo_id` VARCHAR(191) NOT NULL,
  `tipo` VARCHAR(32) NOT NULL,
  `meta_json` TEXT NULL,
  `created_by_id` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `documento_archivo_eventos_documento_archivo_id_idx` (`documento_archivo_id`),
  INDEX `documento_archivo_eventos_created_by_id_idx` (`created_by_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `documento_archivos` ADD CONSTRAINT `documento_archivos_documento_id_fkey` FOREIGN KEY (`documento_id`) REFERENCES `documentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documento_archivos` ADD CONSTRAINT `documento_archivos_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documento_archivo_eventos` ADD CONSTRAINT `documento_archivo_eventos_documento_archivo_id_fkey` FOREIGN KEY (`documento_archivo_id`) REFERENCES `documento_archivos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documento_archivo_eventos` ADD CONSTRAINT `documento_archivo_eventos_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

