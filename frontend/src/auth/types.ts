export type RoleInfo = {
  codigo: string;
  nombre: string;
};

export type AuthUser = {
  id: string;
  email: string;
  nombres: string | null;
  apellidos: string | null;
  dependenciaId: string | null;
  roles: RoleInfo[];
};
