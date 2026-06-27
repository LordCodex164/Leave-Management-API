import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePublicHolidayDto } from './dto/create-public-holiday.dto';
export declare class PublicHolidaysService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(createPublicHolidayDto: CreatePublicHolidayDto): Promise<{
        date: string;
        description: string;
        createdAt: Date;
    }>;
    findAll(): Promise<{
        date: string;
        description: string;
        createdAt: Date;
    }[]>;
    remove(date: string): Promise<{
        date: string;
        description: string;
        createdAt: Date;
    }>;
}
