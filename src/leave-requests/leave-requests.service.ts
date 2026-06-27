import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ProcessLeaveRequestDto } from './dto/process-leave-request.dto';
import { HolidayCalculator } from './holiday-calculator';

@Injectable()
export class LeaveRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeaveRequestDto) {
    // 1. Validate employee existence
    const employee = await this.prisma.user.findUnique({
      where: { id: dto.employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${dto.employeeId} not found`);
    }

    const { startDate, endDate, isHalfDay = false, halfDayOption, reason } = dto;

    if (startDate > endDate) {
      throw new BadRequestException(`startDate ${startDate} cannot be after endDate ${endDate}`);
    }

    // 2. Fetch public holidays from DB
    const holidays = await this.prisma.publicHoliday.findMany();
    const holidayDates = new Set(holidays.map((h) => h.date));

    let requestedDays = 0;

    if (isHalfDay) {
      if (startDate !== endDate) {
        throw new BadRequestException('Start date and end date must be identical for half-day requests');
      }
      if (!halfDayOption || !['AM', 'PM'].includes(halfDayOption)) {
        throw new BadRequestException('halfDayOption must be either "AM" or "PM" for half-day requests');
      }

      // Check if the requested day is a weekend or holiday
      const requestedDate = HolidayCalculator.parseDate(startDate);
      if (HolidayCalculator.isWeekend(requestedDate)) {
        throw new BadRequestException('Cannot request half-day leave on a weekend');
      }
      if (holidayDates.has(startDate)) {
        throw new BadRequestException(`Cannot request half-day leave on a public holiday (${startDate})`);
      }

      requestedDays = 0.5;
    } else {
      // Calculate working days excluding weekends and public holidays
      requestedDays = HolidayCalculator.calculateWorkingDays(startDate, endDate, holidayDates);

      if (requestedDays === 0) {
        throw new BadRequestException(
          'The requested leave period contains 0 working days (only weekends or public holidays)',
        );
      }
    }

    // 3. Perform atomic checks and request creation inside a transaction to prevent race conditions
    return this.prisma.$transaction(async (tx) => {
      // Re-fetch employee inside transaction for locking/consistency
      const emp = await tx.user.findUnique({
        where: { id: employee.id },
      });

      if (!emp) {
        throw new NotFoundException(`Employee with ID ${employee.id} not found`);
      }

      // Calculate sum of pending leave requests
      const pendingRequests = await tx.leaveRequest.findMany({
        where: {
          employeeId: emp.id,
          status: 'PENDING',
        },
      });
      const pendingDays = pendingRequests.reduce((sum, r) => sum + r.requestedDays, 0);

      // Check if employee has sufficient remaining balance
      const availableBalance = emp.leaveBalance - pendingDays;
      if (requestedDays > availableBalance) {
        throw new BadRequestException(
          `Insufficient leave balance. Available: ${availableBalance} days (Balance: ${emp.leaveBalance}, Pending: ${pendingDays}), Requested: ${requestedDays} days`,
        );
      }

      // Check for overlapping requests (PENDING or APPROVED)
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
          // If at least one is a full day, it's a conflict since date ranges overlap
          throw new BadRequestException(
            `Overlapping leave request exists: ${req.startDate} to ${req.endDate} (${req.status})`,
          );
        } else {
          // Both are half-days. They only conflict if they are on the same day and have the same AM/PM option
          if (req.startDate === startDate && req.halfDayOption === halfDayOption) {
            throw new BadRequestException(
              `Overlapping half-day leave request exists for ${startDate} (${halfDayOption})`,
            );
          }
        }
      }

      // All checks passed, create the request
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

  async findAll(filters: { employeeId?: string; status?: string; managerId?: string }) {
    const where: any = {};

    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.managerId) {
      // Find requests of employees managed by this manager
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

  async findOne(id: string) {
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
      throw new NotFoundException(`Leave request with ID ${id} not found`);
    }

    return request;
  }

  async approve(id: string, dto: ProcessLeaveRequestDto) {
    const request = await this.findOne(id);

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve a leave request that is already in ${request.status} status`);
    }

    // Validate approver
    const approver = await this.prisma.user.findUnique({
      where: { id: dto.approverId },
    });

    if (!approver) {
      throw new NotFoundException(`Approver with ID ${dto.approverId} not found`);
    }

    if (approver.role !== 'MANAGER' && approver.role !== 'ADMIN') {
      throw new BadRequestException(`Approver must have role MANAGER or ADMIN`);
    }

    if (request.employeeId === approver.id) {
      throw new BadRequestException(`Employees cannot approve their own leave requests`);
    }

    // Must be either direct manager or admin
    if (approver.role !== 'ADMIN' && request.employee.managerId !== approver.id) {
      throw new BadRequestException(`Only the direct manager or an ADMIN can approve this leave request`);
    }

    // Process approval atomically
    return this.prisma.$transaction(async (tx) => {
      // Re-fetch user inside transaction to lock row and avoid race conditions
      const user = await tx.user.findUnique({
        where: { id: request.employeeId },
      });

      if (!user) {
        throw new NotFoundException(`Employee not found`);
      }

      if (user.leaveBalance < request.requestedDays) {
        throw new BadRequestException(
          `Employee has insufficient leave balance to approve this request (Balance: ${user.leaveBalance}, Required: ${request.requestedDays})`,
        );
      }

      // Deduct leave balance
      await tx.user.update({
        where: { id: user.id },
        data: {
          leaveBalance: user.leaveBalance - request.requestedDays,
        },
      });

      // Update request status
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

  async reject(id: string, dto: ProcessLeaveRequestDto) {
    const request = await this.findOne(id);

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Cannot reject a leave request that is already in ${request.status} status`);
    }

    // Validate approver
    const approver = await this.prisma.user.findUnique({
      where: { id: dto.approverId },
    });

    if (!approver) {
      throw new NotFoundException(`Approver with ID ${dto.approverId} not found`);
    }

    if (approver.role !== 'MANAGER' && approver.role !== 'ADMIN') {
      throw new BadRequestException(`Approver must have role MANAGER or ADMIN`);
    }

    if (request.employeeId === approver.id) {
      throw new BadRequestException(`Employees cannot reject their own leave requests`);
    }

    // Must be direct manager or admin
    if (approver.role !== 'ADMIN' && request.employee.managerId !== approver.id) {
      throw new BadRequestException(`Only the direct manager or an ADMIN can reject this leave request`);
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
}
