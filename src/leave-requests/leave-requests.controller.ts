import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
} from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ProcessLeaveRequestDto } from './dto/process-leave-request.dto';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  create(@Body() createLeaveRequestDto: CreateLeaveRequestDto) {
    return this.leaveRequestsService.create(createLeaveRequestDto);
  }

  @Get()
  findAll(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('managerId') managerId?: string,
  ) {
    return this.leaveRequestsService.findAll({ employeeId, status, managerId });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leaveRequestsService.findOne(id);
  }

  @Patch(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() processLeaveRequestDto: ProcessLeaveRequestDto,
  ) {
    return this.leaveRequestsService.approve(id, processLeaveRequestDto);
  }

  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() processLeaveRequestDto: ProcessLeaveRequestDto,
  ) {
    return this.leaveRequestsService.reject(id, processLeaveRequestDto);
  }
}
