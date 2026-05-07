"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TiposDocumentalesModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const tipos_documentales_controller_1 = require("./tipos-documentales.controller");
const tipos_documentales_service_1 = require("./tipos-documentales.service");
let TiposDocumentalesModule = class TiposDocumentalesModule {
};
exports.TiposDocumentalesModule = TiposDocumentalesModule;
exports.TiposDocumentalesModule = TiposDocumentalesModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [tipos_documentales_controller_1.TiposDocumentalesController],
        providers: [tipos_documentales_service_1.TiposDocumentalesService],
    })
], TiposDocumentalesModule);
//# sourceMappingURL=tipos-documentales.module.js.map