import { PublicHolidaysService } from './public-holidays.service';
import { CreatePublicHolidayDto } from './dto/create-public-holiday.dto';
export declare class PublicHolidaysController {
    private readonly publicHolidaysService;
    constructor(publicHolidaysService: PublicHolidaysService);
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
