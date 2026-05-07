export type JwtRequestUser = {
    id: string;
    email: string;
    nombres: string | null;
    apellidos: string | null;
    roles: {
        codigo: string;
        nombre: string;
    }[];
    dependenciaId: string | null;
};
export declare function jwtUserIsAdmin(u: JwtRequestUser): boolean;
export declare function jwtUserIsRevisor(u: JwtRequestUser): boolean;
