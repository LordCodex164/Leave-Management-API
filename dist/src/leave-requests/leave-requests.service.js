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
exports.LeaveRequestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const holiday_calculator_1 = require("./holiday-calculator");
let LeaveRequestsService = class LeaveRequestsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const employee = await this.prisma.user.findUnique({
            where: { id: dto.employeeId },
        });
        if (!employee) {
            throw new common_1.NotFoundException(`Employee with ID ${dto.employeeId} not found`);
        }
        const { startDate, endDate, isHalfDay = false, halfDayOption, reason } = dto;
        if (startDate > endDate) {
            throw new common_1.BadRequestException(`startDate ${startDate} cannot be after endDate ${endDate}`);
        }
        const holidays = await this.prisma.publicHoliday.findMany();
        const holidayDates = new Set(holidays.map((h) => h.date));
        let requestedDays = 0;
        if (isHalfDay) {
            if (startDate !== endDate) {
                throw new common_1.BadRequestException('Start date and end date must be identical for half-day requests');
            }
            if (!halfDayOption || !['AM', 'PM'].includes(halfDayOption)) {
                throw new common_1.BadRequestException('halfDayOption must be either "AM" or "PM" for half-day requests');
            }
            const requestedDate = holiday_calculator_1.HolidayCalculator.parseDate(startDate);
            if (holiday_calculator_1.HolidayCalculator.isWeekend(requestedDate)) {
                throw new common_1.BadRequestException('Cannot request half-day leave on a weekend');
            }
            if (holidayDates.has(startDate)) {
                throw new common_1.BadRequestException(`Cannot request half-day leave on a public holiday (${startDate})`);
            }
            requestedDays = 0.5;
        }
        else {
            requestedDays = holiday_calculator_1.HolidayCalculator.calculateWorkingDays(startDate, endDate, holidayDates);
            if (requestedDays === 0) {
                throw new common_1.BadRequestException('The requested leave period contains 0 working days (only weekends or public holidays)');
            }
        }
        return this.prisma.$transaction(async (tx) => {
            const emp = await tx.user.findUnique({
                where: { id: employee.id },
            });
            if (!emp) {
                throw new common_1.NotFoundException(`Employee with ID ${employee.id} not found`);
            }
            const pendingRequests = await tx.leaveRequest.findMany({
                where: {
                    employeeId: emp.id,
                    status: 'PENDING',
                },
            });
            const pendingDays = pendingRequests.reduce((sum, r) => sum + r.requestedDays, 0);
            const availableBalance = emp.leaveBalance - pendingDays;
            if (requestedDays > availableBalance) {
                throw new common_1.BadRequestException(`Insufficient leave balance. Available: ${availableBalance} days (Balance: ${emp.leaveBalance}, Pending: ${pendingDays}), Requested: ${requestedDays} days`);
            }
            const overlapping = await tx.leaveRequest.findMany({
                where: {
                    employeeId: emp.id,
                    status: { in: ['PENDING', 'APPROVED'] },
                    startDate: { lte: endDate },
                    endDate: { gte: startDate },
                },
            });
            for (const req of overlapping) {
                const bothAreHalfDays = req.isHalfDay && isHalfDay;
                if (!bothAreHalfDays) {
                    throw new common_1.BadRequestException(`Overlapping leave request exists: ${req.startDate} to ${req.endDate} (${req.status})`);
                }
                else {
                    if (req.startDate === startDate && req.halfDayOption === halfDayOption) {
                        throw new common_1.BadRequestException(`Overlapping half-day leave request exists for ${startDate} (${halfDayOption})`);
                    }
                }
            }
            return tx.leaveRequest.create({
                data: {
                    employeeId: emp.id,
                    startDate,
                    endDate,
                    isHalfDay,
                    halfDayOption: isHalfDay ? halfDayOption : null,
                    requestedDays,
                    reason,
                    status: 'PENDING',
                },
            });
        });
    }
    async findAll(filters) {
        const where = {};
        if (filters.employeeId) {
            where.employeeId = filters.employeeId;
        }
        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.managerId) {
            where.employee = {
                managerId: filters.managerId,
            };
        }
        return this.prisma.leaveRequest.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        managerId: true,
                    },
                },
                approver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const request = await this.prisma.leaveRequest.findUnique({
            where: { id },
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        managerId: true,
                        leaveBalance: true,
                    },
                },
                approver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        if (!request) {
            throw new common_1.NotFoundException(`Leave request with ID ${id} not found`);
        }
        return request;
    }
    async approve(id, dto) {
        const request = await this.findOne(id);
        if (request.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Cannot approve a leave request that is already in ${request.status} status`);
        }
        const approver = await this.prisma.user.findUnique({
            where: { id: dto.approverId },
        });
        if (!approver) {
            throw new common_1.NotFoundException(`Approver with ID ${dto.approverId} not found`);
        }
        if (approver.role !== 'MANAGER' && approver.role !== 'ADMIN') {
            throw new common_1.BadRequestException(`Approver must have role MANAGER or ADMIN`);
        }
        if (request.employeeId === approver.id) {
            throw new common_1.BadRequestException(`Employees cannot approve their own leave requests`);
        }
        if (approver.role !== 'ADMIN' && request.employee.managerId !== approver.id) {
            throw new common_1.BadRequestException(`Only the direct manager or an ADMIN can approve this leave request`);
        }
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: request.employeeId },
            });
            if (!user) {
                throw new common_1.NotFoundException(`Employee not found`);
            }
            if (user.leaveBalance < request.requestedDays) {
                throw new common_1.BadRequestException(`Employee has insufficient leave balance to approve this request (Balance: ${user.leaveBalance}, Required: ${request.requestedDays})`);
            }
            await tx.user.update({
                where: { id: user.id },
                data: {
                    leaveBalance: user.leaveBalance - request.requestedDays,
                },
            });
            return tx.leaveRequest.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    approverId: approver.id,
                    comments: dto.comments || null,
                },
            });
        });
    }
    async reject(id, dto) {
        const request = await this.findOne(id);
        if (request.status !== 'PENDING') {
            throw new common_1.BadRequestException(`Cannot reject a leave request that is already in ${request.status} status`);
        }
        const approver = await this.prisma.user.findUnique({
            where: { id: dto.approverId },
        });
        if (!approver) {
            throw new common_1.NotFoundException(`Approver with ID ${dto.approverId} not found`);
        }
        if (approver.role !== 'MANAGER' && approver.role !== 'ADMIN') {
            throw new common_1.BadRequestException(`Approver must have role MANAGER or ADMIN`);
        }
        if (request.employeeId === approver.id) {
            throw new common_1.BadRequestException(`Employees cannot reject their own leave requests`);
        }
        if (approver.role !== 'ADMIN' && request.employee.managerId !== approver.id) {
            throw new common_1.BadRequestException(`Only the direct manager or an ADMIN can reject this leave request`);
        }
        return this.prisma.leaveRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approverId: approver.id,
                comments: dto.comments || null,
            },
        });
    }
};
exports.LeaveRequestsService = LeaveRequestsService;
exports.LeaveRequestsService = LeaveRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeaveRequestsService);
//# sourceMappingURL=leave-requests.service.js.map