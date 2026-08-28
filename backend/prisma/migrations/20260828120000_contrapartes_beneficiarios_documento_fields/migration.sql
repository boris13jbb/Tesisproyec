-- Contrapartes, beneficiarios y campos documentales extendidos

CREATE TABLE `contrapartes` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(16) NOT NULL,
    `cedula` VARCHAR(10) NULL,
    `ruc` VARCHAR(13) NULL,
    `nombres` VARCHAR(120) NULL,
    `apellidos` VARCHAR(120) NULL,
    `razon_social` VARCHAR(250) NULL,
    `correo` VARCHAR(255) NULL,
    `telefono` VARCHAR(32) NULL,
    `direccion` VARCHAR(500) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contrapartes_cedula_key`(`cedula`),
    UNIQUE INDEX `contrapartes_ruc_key`(`ruc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `beneficiarios` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(16) NOT NULL,
    `cedula` VARCHAR(10) NULL,
    `ruc` VARCHAR(13) NULL,
    `nombres` VARCHAR(120) NULL,
    `apellidos` VARCHAR(120) NULL,
    `razon_social` VARCHAR(250) NULL,
    `correo` VARCHAR(255) NULL,
    `telefono` VARCHAR(32) NULL,
    `direccion` VARCHAR(500) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `beneficiarios_cedula_key`(`cedula`),
    UNIQUE INDEX `beneficiarios_ruc_key`(`ruc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `documentos` ADD COLUMN `fecha_vencimiento` DATETIME(3) NULL,
    ADD COLUMN `responsable_institucional` VARCHAR(250) NULL,
    ADD COLUMN `contraparte_id` VARCHAR(191) NULL,
    ADD COLUMN `beneficiario_id` VARCHAR(191) NULL;

CREATE INDEX `documentos_contraparte_id_idx` ON `documentos`(`contraparte_id`);
CREATE INDEX `documentos_beneficiario_id_idx` ON `documentos`(`beneficiario_id`);
CREATE INDEX `documentos_created_at_idx` ON `documentos`(`created_at`);
CREATE INDEX `documentos_estado_idx` ON `documentos`(`estado`);

ALTER TABLE `documentos` ADD CONSTRAINT `documentos_contraparte_id_fkey` FOREIGN KEY (`contraparte_id`) REFERENCES `contrapartes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `documentos` ADD CONSTRAINT `documentos_beneficiario_id_fkey` FOREIGN KEY (`beneficiario_id`) REFERENCES `beneficiarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
