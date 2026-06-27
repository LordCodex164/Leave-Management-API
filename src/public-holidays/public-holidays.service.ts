import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePublicHolidayDto } from './dto/create-public-holiday.dto';

@Injectable()
export class PublicHolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPublicHolidayDto: CreatePublicHolidayDto) {
    const existing = await this.prisma.publicHoliday.findUnique({
      where: { date: createPublicHolidayDto.date },
    });

    if (existing) {
      throw new ConflictException(`Public holiday on ${createPublicHolidayDto.date} already exists`);
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

  async remove(date: string) {
    const existing = await this.prisma.publicHoliday.findUnique({
      where: { date },
    });

    if (!existing) {
      throw new NotFoundException(`Public holiday on ${date} not found`);
    }

    return this.prisma.publicHoliday.delete({
      where: { date },
    });
  }
}
