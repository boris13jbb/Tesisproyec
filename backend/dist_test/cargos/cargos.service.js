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
exports.CargosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_util_1 = require("../common/prisma-util");
const prisma_service_1 = require("../prisma/prisma.service");
const cargoInclude = {
    dependencia: {
        select: { id: true, codigo: true, nombre: true },
    },
};
let CargosService = class CargosService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(incluirInactivos) {
        return this.prisma.cargo.findMany({
            where: incluirInactivos ? undefined : { activo: true },
            include: cargoInclude,
            orderBy: [{ codigo: 'asc' }],
        });
    }
    async findOne(id) {
        const row = await this.prisma.cargo.findUnique({
            where: { id },
            include: cargoInclude,
        });
        if (!row) {
            throw new common_1.NotFoundException('Cargo no encontrado');
        }
        return row;
    }
    async assertDependenciaExists(dependenciaId) {
        if (dependenciaId === undefined || dependenciaId === null) {
            return;
        }
        const d = await this.prisma.dependencia.findUnique({
            where: { id: dependenciaId },
        });
        if (!d) {
            throw new common_1.BadRequestException('Dependencia no encontrada');
        }
    }
    async create(dto) {
        const codigo = dto.codigo.trim().toUpperCase();
        await this.assertDependenciaExists(dto.dependenciaId ?? null);
        try {
            return await this.prisma.cargo.create({
                data: {
                    codigo,
                    nombre: dto.nombre.trim(),
                    descripcion: dto.descripcion?.trim() || null,
                    dependenciaId: dto.dependenciaId ?? null,
                },
                include: cargoInclude,
            });
        }
        catch (e) {
            if ((0, prisma_util_1.isPrismaCode)(e, 'P2002')) {
                throw new common_1.ConflictException('Ya existe un cargo con ese código');
            }
            throw e;
        }
    }
    async update(id, dto) {
        await this.findOne(id);
        await this.assertDependenciaExists(dto.dependenciaId === undefined ? undefined : dto.dependenciaId);
        if (dto.nombre === undefined &&
            dto.descripcion === undefined &&
            dto.activo === undefined &&
            dto.dependenciaId === undefined) {
            return this.findOne(id);
        }
        try {
            return await this.prisma.cargo.update({
                where: { id },
                data: {
                    ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
                    ...(dto.descripcion !== undefined && {
                        descripcion: dto.descripcion === null || dto.descripcion === ''
                            ? null
                            : dto.descripcion.trim(),
                    }),
                    ...(dto.activo !== undefined && { activo: dto.activo }),
                    ...(dto.dependenciaId !== undefined && {
                        dependenciaId: dto.dependenciaId,
                    }),
                },
                include: cargoInclude,
            });
        }
        catch (e) {
            if ((0, prisma_util_1.isPrismaCode)(e, 'P2025')) {
                throw new common_1.NotFoundException('Cargo no encontrado');
            }
            throw e;
        }
    }
};
exports.CargosService = CargosService;
exports.CargosService = CargosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CargosService);
//# sourceMappingURL=cargos.service.js.map