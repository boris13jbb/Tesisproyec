-- AlterTable
ALTER TABLE `refresh_tokens`
ADD COLUMN `last_used_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE INDEX `refresh_tokens_last_used_at_idx` ON `refresh_tokens`(`last_used_at`);

