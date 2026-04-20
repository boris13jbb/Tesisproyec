-- CreateTable
CREATE TABLE `series` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(32) NOT NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `descripcion` VARCHAR(500) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `series_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subseries` (
    `id` VARCHAR(191) NOT NULL,
    `serie_id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(32) NOT NULL,
    `nombre` VARCHAR(200) NOT NULL,
    `descripcion` VARCHAR(500) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subseries_codigo_key`(`codigo`),
    INDEX `subseries_serie_id_idx`(`serie_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `subseries` ADD CONSTRAINT `subseries_serie_id_fkey` FOREIGN KEY (`serie_id`) REFERENCES `series`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

