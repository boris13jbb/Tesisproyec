-- AlterTable
ALTER TABLE `documentos` ADD COLUMN `access_policy` VARCHAR(16) NOT NULL DEFAULT 'INHERIT';

-- CreateTable
CREATE TABLE `documento_user_access` (
    `documento_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `access` VARCHAR(16) NOT NULL DEFAULT 'READ',
    `created_by_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `documento_user_access_user_id_idx`(`user_id`),
    INDEX `documento_user_access_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`documento_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documento_role_access` (
    `documento_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `access` VARCHAR(16) NOT NULL DEFAULT 'READ',
    `created_by_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `documento_role_access_role_id_idx`(`role_id`),
    INDEX `documento_role_access_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`documento_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddIndex
CREATE INDEX `documentos_access_policy_idx` ON `documentos`(`access_policy`);

-- AddForeignKey
ALTER TABLE `documento_user_access` ADD CONSTRAINT `documento_user_access_documento_id_fkey` FOREIGN KEY (`documento_id`) REFERENCES `documentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documento_user_access` ADD CONSTRAINT `documento_user_access_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documento_user_access` ADD CONSTRAINT `documento_user_access_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documento_role_access` ADD CONSTRAINT `documento_role_access_documento_id_fkey` FOREIGN KEY (`documento_id`) REFERENCES `documentos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documento_role_access` ADD CONSTRAINT `documento_role_access_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documento_role_access` ADD CONSTRAINT `documento_role_access_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

