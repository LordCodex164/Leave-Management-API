import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn(['EMPLOYEE', 'MANAGER', 'ADMIN'])
  role: string;

  @IsString()
  @IsOptional()
  managerId?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  leaveBalance?: number;
}
