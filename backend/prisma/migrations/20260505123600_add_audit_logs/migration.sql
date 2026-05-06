-- CreateTable
CREATE TABLE `audit_logs` (
  `id` VARCHAR(36) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  `actor_user_id` VARCHAR(36) NULL,
  `actor_email` VARCHAR(255) NULL,

  `action` VARCHAR(64) NOT NULL,
  `result` VARCHAR(16) NOT NULL,

  `resource_type` VARCHAR(64) NULL,
  `resource_id` VARCHAR(64) NULL,

  `ip` VARCHAR(64) NULL,
  `user_agent` VARCHAR(255) NULL,
  `correlation_id` VARCHAR(64) NULL,
  `meta_json` TEXT NULL,

  INDEX `audit_logs_created_at_idx` (`created_at`),
  INDEX `audit_logs_action_created_at_idx` (`action`, `created_at`),
  INDEX `audit_logs_actor_user_id_created_at_idx` (`actor_user_id`, `created_at`),
  INDEX `audit_logs_resource_type_resource_id_idx` (`resource_type`, `resource_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `audit_logs`
ADD CONSTRAINT `audit_logs_actor_user_id_fkey`
FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;

