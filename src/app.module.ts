import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { PublicHolidaysModule } from './public-holidays/public-holidays.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';

@Module({
  imports: [PrismaModule, UsersModule, PublicHolidaysModule, LeaveRequestsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
