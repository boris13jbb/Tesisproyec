-- CreateTable
CREATE TABLE `cargos` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(32) NOT NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `descripcion` VARCHAR(500) NULL,
    `dependencia_id` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cargos_codigo_key`(`codigo`),
    INDEX `cargos_dependencia_id_idx`(`dependencia_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cargos` ADD CONSTRAINT `cargos_dependencia_id_fkey` FOREIGN KEY (`dependencia_id`) REFERENCES `dependencias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
