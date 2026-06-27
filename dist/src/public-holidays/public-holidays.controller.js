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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicHolidaysController = void 0;
const common_1 = require("@nestjs/common");
const public_holidays_service_1 = require("./public-holidays.service");
const create_public_holiday_dto_1 = require("./dto/create-public-holiday.dto");
let PublicHolidaysController = class PublicHolidaysController {
    constructor(publicHolidaysService) {
        this.publicHolidaysService = publicHolidaysService;
    }
    create(createPublicHolidayDto) {
        return this.publicHolidaysService.create(createPublicHolidayDto);
    }
    findAll() {
        return this.publicHolidaysService.findAll();
    }
    remove(date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new common_1.BadRequestException('Date parameter must be in YYYY-MM-DD format');
        }
        return this.publicHolidaysService.remove(date);
    }
};
exports.PublicHolidaysController = PublicHolidaysController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_public_holiday_dto_1.CreatePublicHolidayDto]),
    __metadata("design:returntype", void 0)
], PublicHolidaysController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicHolidaysController.prototype, "findAll", null);
__decorate([
    (0, common_1.Delete)(':date'),
    __param(0, (0, common_1.Param)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicHolidaysController.prototype, "remove", null);
exports.PublicHolidaysController = PublicHolidaysController = __decorate([
    (0, common_1.Controller)('public-holidays'),
    __metadata("design:paramtypes", [public_holidays_service_1.PublicHolidaysService])
], PublicHolidaysController);
//# sourceMappingURL=public-holidays.controller.js.map