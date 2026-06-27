import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ProcessLeaveRequestDto } from './dto/process-leave-request.dto';
export declare class LeaveRequestsController {
    private readonly leaveRequestsService;
    constructor(leaveRequestsService: LeaveRequestsService);
    create(createLeaveRequestDto: CreateLeaveRequestDto): Promise<{
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
    findAll(employeeId?: string, status?: string, managerId?: string): Promise<({
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
    approve(id: string, processLeaveRequestDto: ProcessLeaveRequestDto): Promise<{
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
    reject(id: string, processLeaveRequestDto: ProcessLeaveRequestDto): Promise<{
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
