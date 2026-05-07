"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateDocumentoDto = exports.NIVELES_CONFIDENCIALIDAD = void 0;
const class_validator_1 = require("class-validator");
const ESTADOS_INICIALES = ['BORRADOR', 'REGISTRADO'];
exports.NIVELES_CONFIDENCIALIDAD = [
    'PUBLICO',
    'INTERNO',
    'RESERVADO',
    'CONFIDENCIAL',
];
class CreateDocumentoDto {
    codigo;
    asunto;
    descripcion;
    fechaDocumento;
    tipoDocumentalId;
    subserieId;
    dependenciaId;
    nivelConfidencialidad;
    estado;
}
exports.CreateDocumentoDto = CreateDocumentoDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(64),
    __metadata("design:type", String)
], CreateDocumentoDto.prototype, "codigo", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(250),
    __metadata("design:type", String)
], CreateDocumentoDto.prototype, "asunto", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateDocumentoDto.prototype, "descripcion", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateDocumentoDto.prototype, "fechaDocumento", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateDocumentoDto.prototype, "tipoDocumentalId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateDocumentoDto.prototype, "subserieId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateDocumentoDto.prototype, "dependenciaId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(exports.NIVELES_CONFIDENCIALIDAD),
    __metadata("design:type", Object)
], CreateDocumentoDto.prototype, "nivelConfidencialidad", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(ESTADOS_INICIALES),
    __metadata("design:type", String)
], CreateDocumentoDto.prototype, "estado", void 0);
//# sourceMappingURL=create-documento.dto.js.map