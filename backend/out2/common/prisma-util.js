"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPrismaCode = isPrismaCode;
function isPrismaCode(e, code) {
    return (typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        e.code === code);
}
//# sourceMappingURL=prisma-util.js.map