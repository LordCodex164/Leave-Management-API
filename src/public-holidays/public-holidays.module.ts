import { Module } from '@nestjs/common';
import { PublicHolidaysService } from './public-holidays.service';
import { PublicHolidaysController } from './public-holidays.controller';

@Module({
  controllers: [PublicHolidaysController],
  providers: [PublicHolidaysService],
  exports: [PublicHolidaysService], // export so other modules can use it (e.g. LeaveRequests to calculate holidays)
})
export class PublicHolidaysModule {}
