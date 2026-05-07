import { NIVELES_CONFIDENCIALIDAD } from './create-documento.dto';
export declare class UpdateDocumentoDto {
    asunto?: string;
    descripcion?: string | null;
    fechaDocumento?: string;
    tipoDocumentalId?: string;
    subserieId?: string;
    estado?: string;
    activo?: boolean;
    dependenciaId?: string | null;
    nivelConfidencialidad?: (typeof NIVELES_CONFIDENCIALIDAD)[number];
}
