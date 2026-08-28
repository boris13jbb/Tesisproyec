-- SLA de revisión + notificaciones in-app (R-27/R-44)

ALTER TABLE `documentos`
  ADD COLUMN `fecha_ingreso_revision` DATETIME(3) NULL,
  ADD COLUMN `fecha_limite_sla` DATETIME(3) NULL;

CREATE INDEX `documentos_fecha_ingreso_revision_idx` ON `documentos`(`fecha_ingreso_revision`);
CREATE INDEX `documentos_fecha_limite_sla_idx` ON `documentos`(`fecha_limite_sla`);
CREATE INDEX `documentos_fecha_vencimiento_idx` ON `documentos`(`fecha_vencimiento`);

CREATE TABLE `user_notifications` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `tipo` VARCHAR(64) NOT NULL,
  `titulo` VARCHAR(200) NOT NULL,
  `mensaje` VARCHAR(1000) NULL,
  `resource_type` VARCHAR(64) NULL,
  `resource_id` VARCHAR(36) NULL,
  `leido` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `user_notifications_user_id_leido_created_at_idx`(`user_id`, `leido`, `created_at`),
  INDEX `user_notifications_resource_type_resource_id_idx`(`resource_type`, `resource_id`),
  CONSTRAINT `user_notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
