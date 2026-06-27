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
exports.PublicHolidaysService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
let PublicHolidaysService = class PublicHolidaysService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createPublicHolidayDto) {
        const existing = await this.prisma.publicHoliday.findUnique({
            where: { date: createPublicHolidayDto.date },
        });
        if (existing) {
            throw new common_1.ConflictException(`Public holiday on ${createPublicHolidayDto.date} already exists`);
        }
        return this.prisma.publicHoliday.create({
            data: {
                date: createPublicHolidayDto.date,
                description: createPublicHolidayDto.description,
            },
        });
    }
    async findAll() {
        return this.prisma.publicHoliday.findMany({
            orderBy: { date: 'asc' },
        });
    }
    async remove(date) {
        const existing = await this.prisma.publicHoliday.findUnique({
            where: { date },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Public holiday on ${date} not found`);
        }
        return this.prisma.publicHoliday.delete({
            where: { date },
        });
    }
};
exports.PublicHolidaysService = PublicHolidaysService;
exports.PublicHolidaysService = PublicHolidaysService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PublicHolidaysService);
//# sourceMappingURL=public-holidays.service.js.map