"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtUserIsAdmin = jwtUserIsAdmin;
exports.jwtUserIsRevisor = jwtUserIsRevisor;
function jwtUserIsAdmin(u) {
    return u.roles.some((r) => r.codigo === 'ADMIN');
}
function jwtUserIsRevisor(u) {
    return u.roles.some((r) => r.codigo === 'REVISOR');
}
//# sourceMappingURL=request-user.js.map