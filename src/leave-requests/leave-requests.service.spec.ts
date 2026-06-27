import { Test, TestingModule } from '@nestjs/testing';
import { LeaveRequestsService } from './leave-requests.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('LeaveRequestsService', () => {
  let service: LeaveRequestsService;
  let prisma: PrismaService;

  const mockEmployee = {
    id: 'emp-123',
    email: 'bob@company.com',
    name: 'Bob Employee',
    role: 'EMPLOYEE',
    managerId: 'mgr-123',
    leaveBalance: 20.0,
  };

  const mockManager = {
    id: 'mgr-123',
    email: 'jane@company.com',
    name: 'Jane Manager',
    role: 'MANAGER',
    managerId: null,
    leaveBalance: 25.0,
  };

  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@company.com',
    name: 'Admin User',
    role: 'ADMIN',
    managerId: null,
    leaveBalance: 20.0,
  };

  const mockOtherUser = {
    id: 'other-123',
    email: 'other@company.com',
    name: 'Other Employee',
    role: 'EMPLOYEE',
    managerId: null,
    leaveBalance: 20.0,
  };

  const mockTx = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    leaveRequest: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    publicHoliday: {
      findMany: jest.fn(),
    },
    leaveRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveRequestsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LeaveRequestsService>(LeaveRequestsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
    // Default transaction mock executes the callback with mockTx
    mockPrismaService.$transaction.mockImplementation((cb) => cb(mockTx));
  });

  describe('create', () => {
    it('should throw NotFoundException if employee does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          employeeId: 'invalid-id',
          startDate: '2026-06-01',
          endDate: '2026-06-05',
          reason: 'Vacation',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully submit a valid request', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.publicHoliday.findMany.mockResolvedValue([]);
      mockTx.user.findUnique.mockResolvedValue(mockEmployee);
      mockTx.leaveRequest.findMany.mockResolvedValueOnce([]); // no pending
      mockTx.leaveRequest.findMany.mockResolvedValueOnce([]); // no overlaps
      mockTx.leaveRequest.create.mockResolvedValue({ id: 'req-1', status: 'PENDING' });

      const res = await service.create({
        employeeId: 'emp-123',
        startDate: '2026-06-01',
        endDate: '2026-06-05',
        reason: 'Vacation',
      });

      expect(res.status).toBe('PENDING');
      expect(mockTx.leaveRequest.create).toHaveBeenCalledWith({
        data: {
          employeeId: 'emp-123',
          startDate: '2026-06-01',
          endDate: '2026-06-05',
          isHalfDay: false,
          halfDayOption: null,
          requestedDays: 5,
          reason: 'Vacation',
          status: 'PENDING',
        },
      });
    });

    it('should throw BadRequestException if balance is insufficient', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.publicHoliday.findMany.mockResolvedValue([]);
      mockTx.user.findUnique.mockResolvedValue(mockEmployee);
      // Already has 18 days pending, new request wants 5 days (total 23 > 20 balance)
      mockTx.leaveRequest.findMany.mockResolvedValueOnce([
        { requestedDays: 18 },
      ]);

      await expect(
        service.create({
          employeeId: 'emp-123',
          startDate: '2026-06-01',
          endDate: '2026-06-05', // 5 days
          reason: 'Vacation',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for overlapping requests', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.publicHoliday.findMany.mockResolvedValue([]);
      mockTx.user.findUnique.mockResolvedValue(mockEmployee);
      mockTx.leaveRequest.findMany.mockResolvedValueOnce([]); // no pending
      mockTx.leaveRequest.findMany.mockResolvedValueOnce([
        {
          id: 'existing-req',
          startDate: '2026-06-03',
          endDate: '2026-06-04',
          isHalfDay: false,
          status: 'APPROVED',
        },
      ]);

      await expect(
        service.create({
          employeeId: 'emp-123',
          startDate: '2026-06-01',
          endDate: '2026-06-05',
          reason: 'Vacation',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow non-overlapping AM and PM half-days on same day', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.publicHoliday.findMany.mockResolvedValue([]);
      mockTx.user.findUnique.mockResolvedValue(mockEmployee);
      mockTx.leaveRequest.findMany.mockResolvedValueOnce([]); // no pending
      // Existing is AM half-day on same day
      mockTx.leaveRequest.findMany.mockResolvedValueOnce([
        {
          id: 'existing-am',
          startDate: '2026-06-01',
          endDate: '2026-06-01',
          isHalfDay: true,
          halfDayOption: 'AM',
          status: 'APPROVED',
        },
      ]);
      mockTx.leaveRequest.create.mockResolvedValue({ id: 'req-2', status: 'PENDING' });

      // Requesting PM on same day
      const res = await service.create({
        employeeId: 'emp-123',
        startDate: '2026-06-01',
        endDate: '2026-06-01',
        isHalfDay: true,
        halfDayOption: 'PM',
        reason: 'Dentist appointment',
      });

      expect(res.status).toBe('PENDING');
      expect(mockTx.leaveRequest.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if requesting AM when AM already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockEmployee);
      mockPrismaService.publicHoliday.findMany.mockResolvedValue([]);
      mockTx.user.findUnique.mockResolvedValue(mockEmployee);
      mockTx.leaveRequest.findMany.mockResolvedValueOnce([]); // no pending
      // Existing is AM half-day on same day
      mockTx.leaveRequest.findMany.mockResolvedValueOnce([
        {
          id: 'existing-am',
          startDate: '2026-06-01',
          endDate: '2026-06-01',
          isHalfDay: true,
          halfDayOption: 'AM',
          status: 'PENDING',
        },
      ]);

      await expect(
        service.create({
          employeeId: 'emp-123',
          startDate: '2026-06-01',
          endDate: '2026-06-01',
          isHalfDay: true,
          halfDayOption: 'AM',
          reason: 'Double booking AM',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    const mockRequest = {
      id: 'req-123',
      employeeId: 'emp-123',
      startDate: '2026-06-01',
      endDate: '2026-06-03',
      requestedDays: 3,
      status: 'PENDING',
      employee: mockEmployee,
    };

    it('should succeed when approved by direct manager and deduct balance', async () => {
      mockPrismaService.leaveRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.user.findUnique.mockResolvedValue(mockManager); // approver is manager
      mockTx.user.findUnique.mockResolvedValue(mockEmployee);
      mockTx.user.update.mockResolvedValue(mockEmployee);
      mockTx.leaveRequest.update.mockResolvedValue({ ...mockRequest, status: 'APPROVED' });

      const res = await service.approve('req-123', { approverId: 'mgr-123', comments: 'Have fun!' });

      expect(res.status).toBe('APPROVED');
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: 'emp-123' },
        data: { leaveBalance: 17.0 }, // 20 - 3
      });
    });

    it('should succeed when approved by an admin', async () => {
      mockPrismaService.leaveRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdmin); // approver is admin
      mockTx.user.findUnique.mockResolvedValue(mockEmployee);
      mockTx.user.update.mockResolvedValue(mockEmployee);
      mockTx.leaveRequest.update.mockResolvedValue({ ...mockRequest, status: 'APPROVED' });

      const res = await service.approve('req-123', { approverId: 'admin-123' });

      expect(res.status).toBe('APPROVED');
    });

    it('should throw BadRequestException if approved by employee themselves', async () => {
      mockPrismaService.leaveRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.user.findUnique.mockResolvedValue(mockEmployee); // self-approval

      await expect(
        service.approve('req-123', { approverId: 'emp-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if approved by someone who is not a manager or admin', async () => {
      mockPrismaService.leaveRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.user.findUnique.mockResolvedValue(mockOtherUser);

      await expect(
        service.approve('req-123', { approverId: 'other-123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
