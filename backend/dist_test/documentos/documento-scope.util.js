"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentoVisibilityWhere = documentoVisibilityWhere;
exports.assertUsuarioPuedeVerDocumento = assertUsuarioPuedeVerDocumento;
const common_1 = require("@nestjs/common");
const request_user_1 = require("../auth/request-user");
function documentoVisibilityWhere(viewer) {
    if ((0, request_user_1.jwtUserIsAdmin)(viewer))
        return undefined;
    const or = [
        { nivelConfidencialidad: 'PUBLICO' },
        { createdById: viewer.id },
    ];
    if (viewer.dependenciaId) {
        or.push({
            AND: [
                { dependenciaId: viewer.dependenciaId },
                { nivelConfidencialidad: { in: ['INTERNO', 'RESERVADO'] } },
            ],
        });
    }
    return { OR: or };
}
function assertUsuarioPuedeVerDocumento(row, viewer) {
    if ((0, request_user_1.jwtUserIsAdmin)(viewer))
        return;
    if (row.nivelConfidencialidad === 'CONFIDENCIAL') {
        throw new common_1.NotFoundException('Documento no encontrado');
    }
    if (row.nivelConfidencialidad === 'PUBLICO')
        return;
    if (row.createdById === viewer.id)
        return;
    if (viewer.dependenciaId &&
        row.dependenciaId === viewer.dependenciaId &&
        (row.nivelConfidencialidad === 'INTERNO' ||
            row.nivelConfidencialidad === 'RESERVADO')) {
        return;
    }
    throw new common_1.NotFoundException('Documento no encontrado');
}
//# sourceMappingURL=documento-scope.util.js.map