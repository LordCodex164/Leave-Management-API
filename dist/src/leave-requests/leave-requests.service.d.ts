import { PrismaService } from '../common/prisma/prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ProcessLeaveRequestDto } from './dto/process-leave-request.dto';
export declare class LeaveRequestsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateLeaveRequestDto): Promise<{
        createdAt: Date;
        id: string;
        updatedAt: Date;
        employeeId: string;
        startDate: string;
        endDate: string;
        isHalfDay: boolean;
        halfDayOption: string | null;
        reason: string;
        approverId: string | null;
        comments: string | null;
        requestedDays: number;
        status: string;
    }>;
    findAll(filters: {
        employeeId?: string;
        status?: string;
        managerId?: string;
    }): Promise<({
        employee: {
            name: string;
            id: string;
            email: string;
            role: string;
            managerId: string | null;
        };
        approver: {
            name: string;
            id: string;
            email: string;
            role: string;
        } | null;
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        employeeId: string;
        startDate: string;
        endDate: string;
        isHalfDay: boolean;
        halfDayOption: string | null;
        reason: string;
        approverId: string | null;
        comments: string | null;
        requestedDays: number;
        status: string;
    })[]>;
    findOne(id: string): Promise<{
        employee: {
            name: string;
            id: string;
            email: string;
            role: string;
            leaveBalance: number;
            managerId: string | null;
        };
        approver: {
            name: string;
            id: string;
            email: string;
            role: string;
        } | null;
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        employeeId: string;
        startDate: string;
        endDate: string;
        isHalfDay: boolean;
        halfDayOption: string | null;
        reason: string;
        approverId: string | null;
        comments: string | null;
        requestedDays: number;
        status: string;
    }>;
    approve(id: string, dto: ProcessLeaveRequestDto): Promise<{
        createdAt: Date;
        id: string;
        updatedAt: Date;
        employeeId: string;
        startDate: string;
        endDate: string;
        isHalfDay: boolean;
        halfDayOption: string | null;
        reason: string;
        approverId: string | null;
        comments: string | null;
        requestedDays: number;
        status: string;
    }>;
    reject(id: string, dto: ProcessLeaveRequestDto): Promise<{
        createdAt: Date;
        id: string;
        updatedAt: Date;
        employeeId: string;
        startDate: string;
        endDate: string;
        isHalfDay: boolean;
        halfDayOption: string | null;
        reason: string;
        approverId: string | null;
        comments: string | null;
        requestedDays: number;
        status: string;
    }>;
}
