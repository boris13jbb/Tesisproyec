-- Último inicio de sesión exitoso con credenciales (actualizado en AUTH_LOGIN_OK).
ALTER TABLE `users` ADD COLUMN `ultimo_login_at` DATETIME(3) NULL;
