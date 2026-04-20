/**
 * Borra node_modules/.prisma para evitar EPERM al renombrar query_engine en Windows.
 * Si falla con EPERM, cierra Node (backend, Prisma Studio), Cursor o usa Administrador de tareas.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'node_modules', '.prisma');
try {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('[clean-prisma-client] Eliminado:', dir);
} catch (err) {
  if (err && err.code === 'ENOENT') {
    process.exit(0);
  }
  if (err && (err.code === 'EPERM' || err.code === 'EBUSY')) {
    console.error(
      '[clean-prisma-client] No se puede borrar (archivo en uso). Pasos:\n' +
        '  1) Ctrl+C en todas las terminales con el backend o Prisma Studio.\n' +
        '  2) Administrador de tareas → finalizar procesos "Node.js".\n' +
        '  3) Cerrar y reabrir Cursor/VS Code si el bloqueo continúa.\n' +
        '  4) Luego: npm run prisma:generate:clean',
    );
    process.exit(1);
  }
  console.error('[clean-prisma-client]', err.message);
  process.exit(1);
}
