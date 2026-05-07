export declare class CreateUsuarioDto {
    email: string;
    password: string;
    nombres?: string;
    apellidos?: string;
    dependenciaId?: string;
    cargoId?: string;
    activo?: boolean;
    roles?: string[];
    invitarPorCorreo?: boolean;
}
