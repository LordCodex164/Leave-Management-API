import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto): Promise<{
        createdAt: Date;
        name: string;
        id: string;
        email: string;
        role: string;
        leaveBalance: number;
        updatedAt: Date;
        managerId: string | null;
    }>;
    findAll(): Promise<({
        manager: {
            name: string;
            id: string;
            email: string;
            role: string;
        } | null;
    } & {
        createdAt: Date;
        name: string;
        id: string;
        email: string;
        role: string;
        leaveBalance: number;
        updatedAt: Date;
        managerId: string | null;
    })[]>;
    findOne(id: string): Promise<{
        manager: {
            name: string;
            id: string;
            email: string;
            role: string;
        } | null;
        subordinates: {
            name: string;
            id: string;
            email: string;
            role: string;
        }[];
        leaveRequests: {
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
        }[];
    } & {
        createdAt: Date;
        name: string;
        id: string;
        email: string;
        role: string;
        leaveBalance: number;
        updatedAt: Date;
        managerId: string | null;
    }>;
    updateBalance(id: string, updateBalanceDto: UpdateBalanceDto): Promise<{
        createdAt: Date;
        name: string;
        id: string;
        email: string;
        role: string;
        leaveBalance: number;
        updatedAt: Date;
        managerId: string | null;
    }>;
}
