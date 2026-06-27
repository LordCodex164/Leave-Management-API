import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { PublicHolidaysService } from './public-holidays.service';
import { CreatePublicHolidayDto } from './dto/create-public-holiday.dto';

@Controller('public-holidays')
export class PublicHolidaysController {
  constructor(private readonly publicHolidaysService: PublicHolidaysService) {}

  @Post()
  create(@Body() createPublicHolidayDto: CreatePublicHolidayDto) {
    return this.publicHolidaysService.create(createPublicHolidayDto);
  }

  @Get()
  findAll() {
    return this.publicHolidaysService.findAll();
  }

  @Delete(':date')
  remove(@Param('date') date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Date parameter must be in YYYY-MM-DD format');
    }
    return this.publicHolidaysService.remove(date);
  }
}
