import { parseMysqlDatabaseUrl } from './mysql-url.util';

describe('parseMysqlDatabaseUrl', () => {
  it('parsea URL Prisma típica', () => {
    const c = parseMysqlDatabaseUrl(
      'mysql://app_user:p%40ss@127.0.0.1:3306/gestion_documental_gadpr_lm',
    );
    expect(c.host).toBe('127.0.0.1');
    expect(c.port).toBe('3306');
    expect(c.user).toBe('app_user');
    expect(c.password).toBe('p@ss');
    expect(c.database).toBe('gestion_documental_gadpr_lm');
  });

  it('rechaza vacío o sin base', () => {
    expect(() => parseMysqlDatabaseUrl('')).toThrow();
    expect(() =>
      parseMysqlDatabaseUrl('mysql://u:p@127.0.0.1:3306/'),
    ).toThrow();
  });
});
