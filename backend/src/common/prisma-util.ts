/** Comprueba códigos de error de Prisma sin depender del tipo generado del cliente. */
export function isPrismaCode(e: unknown, code: string): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code: string }).code === code
  );
}
