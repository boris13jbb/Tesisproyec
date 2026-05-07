-- Política institucional persistida (ISO 15489): evidencia de configuración deseada (no secretos)
CREATE TABLE `security_policy` (
  `id` VARCHAR(64) NOT NULL,
  `desired_password_min_length` INTEGER NOT NULL DEFAULT 8,
  `desired_lockout_enabled` BOOLEAN NOT NULL DEFAULT true,
  `desired_lockout_max_attempts` INTEGER NOT NULL DEFAULT 5,
  `desired_lockout_minutes` INTEGER NOT NULL DEFAULT 20,
  `desired_jwt_access_expires_in` VARCHAR(16) NOT NULL DEFAULT '15m',
  `desired_refresh_session_days` INTEGER NOT NULL DEFAULT 7,
  `desired_password_history_count` INTEGER NOT NULL DEFAULT 0,
  `desired_admin_step_up_auth` BOOLEAN NOT NULL DEFAULT false,
  `notes` VARCHAR(800) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `updated_by_user_id` VARCHAR(191) NULL,

  INDEX `security_policy_updated_at_idx` (`updated_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `security_policy`
  ADD CONSTRAINT `security_policy_updated_by_user_id_fkey`
  FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

