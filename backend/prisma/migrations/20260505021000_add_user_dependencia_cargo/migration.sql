-- AlterTable
ALTER TABLE `users`
  ADD COLUMN `dependencia_id` VARCHAR(36) NULL,
  ADD COLUMN `cargo_id` VARCHAR(36) NULL;

-- CreateIndex
CREATE INDEX `users_dependencia_id_idx` ON `users`(`dependencia_id`);
CREATE INDEX `users_cargo_id_idx` ON `users`(`cargo_id`);

-- AddForeignKey
ALTER TABLE `users`
  ADD CONSTRAINT `users_dependencia_id_fkey` FOREIGN KEY (`dependencia_id`) REFERENCES `dependencias`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users`
  ADD CONSTRAINT `users_cargo_id_fkey` FOREIGN KEY (`cargo_id`) REFERENCES `cargos`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

