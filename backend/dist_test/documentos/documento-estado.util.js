"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESTADOS_DOCUMENTO = void 0;
exports.normalizeDocumentoEstado = normalizeDocumentoEstado;
exports.esEstadoDocumentoValido = esEstadoDocumentoValido;
exports.assertEstadoCreacionPermitido = assertEstadoCreacionPermitido;
exports.assertTransicionEstado = assertTransicionEstado;
const common_1 = require("@nestjs/common");
exports.ESTADOS_DOCUMENTO = [
    'BORRADOR',
    'REGISTRADO',
    'EN_REVISION',
    'APROBADO',
    'RECHAZADO',
    'ARCHIVADO',
];
const TRANSICIONES = {
    BORRADOR: ['REGISTRADO', 'ARCHIVADO'],
    REGISTRADO: ['EN_REVISION', 'ARCHIVADO'],
    EN_REVISION: ['APROBADO', 'RECHAZADO'],
    RECHAZADO: ['EN_REVISION', 'ARCHIVADO'],
    APROBADO: ['ARCHIVADO'],
    ARCHIVADO: [],
};
function normalizeDocumentoEstado(raw) {
    const u = raw.trim().toUpperCase();
    if (exports.ESTADOS_DOCUMENTO.includes(u)) {
        return u;
    }
    return 'REGISTRADO';
}
function esEstadoDocumentoValido(raw) {
    return exports.ESTADOS_DOCUMENTO.includes(raw.trim().toUpperCase());
}
function assertEstadoCreacionPermitido(estado) {
    if (estado !== 'BORRADOR' && estado !== 'REGISTRADO') {
        throw new common_1.BadRequestException(`Estado inicial no válido: use BORRADOR o REGISTRADO (recibido: ${estado})`);
    }
}
function assertTransicionEstado(estadoActualRaw, estadoNuevo) {
    const from = normalizeDocumentoEstado(estadoActualRaw);
    if (from === estadoNuevo) {
        return;
    }
    const permitidos = TRANSICIONES[from];
    if (!permitidos.includes(estadoNuevo)) {
        throw new common_1.BadRequestException(`Transición de estado no permitida: ${from} → ${estadoNuevo}`);
    }
}
//# sourceMappingURL=documento-estado.util.js.map