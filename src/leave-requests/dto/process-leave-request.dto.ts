import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProcessLeaveRequestDto {
  @IsString()
  @IsNotEmpty()
  approverId: string;

  @IsString()
  @IsOptional()
  comments?: string;
}
