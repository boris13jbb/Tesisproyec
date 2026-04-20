-- CreateTable
CREATE TABLE `documento_eventos` (
  `id` VARCHAR(36) NOT NULL,
  `documento_id` VARCHAR(191) NOT NULL,
  `tipo` VARCHAR(32) NOT NULL,
  `cambios_json` TEXT NULL,
  `created_by_id` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `documento_eventos_documento_id_idx` (`documento_id`),
  INDEX `documento_eventos_created_by_id_idx` (`created_by_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `documento_eventos` ADD CONSTRAINT `documento_eventos_documento_id_fkey` FOREIGN KEY (`documento_id`) REFERENCES `documentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documento_eventos` ADD CONSTRAINT `documento_eventos_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

