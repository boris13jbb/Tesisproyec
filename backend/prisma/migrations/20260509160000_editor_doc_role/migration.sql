-- Rol EDITOR_DOC y permisos por defecto (alineado con prisma/seed.ts).
-- Evita fallo al asignar el rol desde la UI cuando la BD se creó antes de incluir este rol en el seed.

INSERT INTO `roles` (`id`, `codigo`, `nombre`, `descripcion`, `activo`, `created_at`, `updated_at`)
SELECT UUID(), 'EDITOR_DOC', 'Editor documental (complemento)',
       'Otorga edición de metadatos y gestión de archivos en documentos; permisos granulares vía BD (no es administrador)',
       true, NOW(3), NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `codigo` = 'EDITOR_DOC');

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `roles` r
INNER JOIN `permissions` p ON p.`codigo` IN (
  'DASHBOARD_SUMMARY',
  'DOC_READ',
  'DOC_FILES_READ',
  'DOC_FILES_DOWNLOAD',
  'DOC_REVISION_SEND',
  'DOC_UPDATE',
  'DOC_FILES_UPLOAD'
)
WHERE r.`codigo` = 'EDITOR_DOC'
AND NOT EXISTS (
  SELECT 1 FROM `role_permissions` rp
  WHERE rp.`role_id` = r.`id` AND rp.`permission_id` = p.`id`
);
