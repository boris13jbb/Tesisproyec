-- Descarte de alertas del panel por administrador (hasta nueva actividad).
CREATE TABLE `dashboard_alert_acknowledgments` (
  `id` VARCHAR(191) NOT NULL,
  `actor_user_id` VARCHAR(191) NOT NULL,
  `alert_codigo` VARCHAR(64) NOT NULL,
  `acknowledged_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `meta_json` TEXT NULL,

  UNIQUE INDEX `dashboard_alert_acknowledgments_actor_user_id_alert_codigo_key`(`actor_user_id`, `alert_codigo`),
  INDEX `dashboard_alert_acknowledgments_alert_codigo_acknowledged_at_idx`(`alert_codigo`, `acknowledged_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `dashboard_alert_acknowledgments`
  ADD CONSTRAINT `dashboard_alert_acknowledgments_actor_user_id_fkey`
  FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
