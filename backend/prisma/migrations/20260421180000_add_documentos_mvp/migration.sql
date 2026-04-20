-- CreateTable
CREATE TABLE `documentos` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(64) NOT NULL,
    `asunto` VARCHAR(250) NOT NULL,
    `descripcion` VARCHAR(1000) NULL,
    `fecha_documento` DATETIME(3) NOT NULL,
    `estado` VARCHAR(32) NOT NULL DEFAULT 'REGISTRADO',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `tipo_documental_id` VARCHAR(191) NOT NULL,
    `subserie_id` VARCHAR(191) NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `documentos_codigo_key`(`codigo`),
    INDEX `documentos_tipo_documental_id_idx`(`tipo_documental_id`),
    INDEX `documentos_subserie_id_idx`(`subserie_id`),
    INDEX `documentos_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_tipo_documental_id_fkey` FOREIGN KEY (`tipo_documental_id`) REFERENCES `tipos_documentales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_subserie_id_fkey` FOREIGN KEY (`subserie_id`) REFERENCES `subseries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

