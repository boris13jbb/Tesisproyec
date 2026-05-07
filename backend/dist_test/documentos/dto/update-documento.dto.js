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
exports.UpdateDocumentoDto = void 0;
const class_validator_1 = require("class-validator");
const documento_estado_util_1 = require("../documento-estado.util");
const create_documento_dto_1 = require("./create-documento.dto");
class UpdateDocumentoDto {
    asunto;
    descripcion;
    fechaDocumento;
    tipoDocumentalId;
    subserieId;
    estado;
    activo;
    dependenciaId;
    nivelConfidencialidad;
}
exports.UpdateDocumentoDto = UpdateDocumentoDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(250),
    __metadata("design:type", String)
], UpdateDocumentoDto.prototype, "asunto", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", Object)
], UpdateDocumentoDto.prototype, "descripcion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateDocumentoDto.prototype, "fechaDocumento", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateDocumentoDto.prototype, "tipoDocumentalId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateDocumentoDto.prototype, "subserieId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(documento_estado_util_1.ESTADOS_DOCUMENTO),
    __metadata("design:type", String)
], UpdateDocumentoDto.prototype, "estado", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateDocumentoDto.prototype, "activo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((_, v) => v != null && v !== ''),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", Object)
], UpdateDocumentoDto.prototype, "dependenciaId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(create_documento_dto_1.NIVELES_CONFIDENCIALIDAD),
    __metadata("design:type", Object)
], UpdateDocumentoDto.prototype, "nivelConfidencialidad", void 0);
//# sourceMappingURL=update-documento.dto.js.map