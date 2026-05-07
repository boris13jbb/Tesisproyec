import { type DocumentoEstado } from '../documento-estado.util';
export declare const NIVELES_CONFIDENCIALIDAD: readonly ["PUBLICO", "INTERNO", "RESERVADO", "CONFIDENCIAL"];
export declare class CreateDocumentoDto {
    codigo: string;
    asunto: string;
    descripcion?: string;
    fechaDocumento: string;
    tipoDocumentalId: string;
    subserieId: string;
    dependenciaId?: string;
    nivelConfidencialidad?: (typeof NIVELES_CONFIDENCIALIDAD)[number];
    estado?: DocumentoEstado;
}
