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
exports.SubseriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_util_1 = require("../common/prisma-util");
const prisma_service_1 = require("../prisma/prisma.service");
const includeSerie = {
    serie: { select: { id: true, codigo: true, nombre: true } },
};
let SubseriesService = class SubseriesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(incluirInactivos, serieId) {
        return this.prisma.subserie.findMany({
            where: {
                ...(incluirInactivos ? {} : { activo: true }),
                ...(serieId ? { serieId } : {}),
            },
            include: includeSerie,
            orderBy: [{ codigo: 'asc' }],
        });
    }
    async findOne(id) {
        const row = await this.prisma.subserie.findUnique({
            where: { id },
            include: includeSerie,
        });
        if (!row) {
            throw new common_1.NotFoundException('Subserie no encontrada');
        }
        return row;
    }
    async assertSerieExists(serieId) {
        const s = await this.prisma.serie.findUnique({ where: { id: serieId } });
        if (!s) {
            throw new common_1.BadRequestException('Serie no encontrada');
        }
    }
    async create(dto) {
        await this.assertSerieExists(dto.serieId);
        const codigo = dto.codigo.trim().toUpperCase();
        try {
            return await this.prisma.subserie.create({
                data: {
                    serieId: dto.serieId,
                    codigo,
                    nombre: dto.nombre.trim(),
                    descripcion: dto.descripcion?.trim() || null,
                },
                include: includeSerie,
            });
        }
        catch (e) {
            if ((0, prisma_util_1.isPrismaCode)(e, 'P2002')) {
                throw new common_1.ConflictException('Ya existe una subserie con ese código');
            }
            throw e;
        }
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.serieId !== undefined) {
            await this.assertSerieExists(dto.serieId);
        }
        if (dto.serieId === undefined &&
            dto.nombre === undefined &&
            dto.descripcion === undefined &&
            dto.activo === undefined) {
            return this.findOne(id);
        }
        try {
            return await this.prisma.subserie.update({
                where: { id },
                data: {
                    ...(dto.serieId !== undefined && { serieId: dto.serieId }),
                    ...(dto.nombre !== undefined && { nombre: dto.nombre.trim() }),
                    ...(dto.descripcion !== undefined && {
                        descripcion: dto.descripcion === null || dto.descripcion === ''
                            ? null
                            : dto.descripcion.trim(),
                    }),
                    ...(dto.activo !== undefined && { activo: dto.activo }),
                },
                include: includeSerie,
            });
        }
        catch (e) {
            if ((0, prisma_util_1.isPrismaCode)(e, 'P2025')) {
                throw new common_1.NotFoundException('Subserie no encontrada');
            }
            throw e;
        }
    }
};
exports.SubseriesService = SubseriesService;
exports.SubseriesService = SubseriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubseriesService);
//# sourceMappingURL=subseries.service.js.map