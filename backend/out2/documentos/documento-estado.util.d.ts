export declare const ESTADOS_DOCUMENTO: readonly ["BORRADOR", "REGISTRADO", "EN_REVISION", "APROBADO", "RECHAZADO", "ARCHIVADO"];
export type DocumentoEstado = (typeof ESTADOS_DOCUMENTO)[number];
export declare function normalizeDocumentoEstado(raw: string): DocumentoEstado;
export declare function esEstadoDocumentoValido(raw: string): boolean;
export declare function assertEstadoCreacionPermitido(estado: DocumentoEstado): void;
export declare function assertTransicionEstado(estadoActualRaw: string, estadoNuevo: DocumentoEstado): void;
