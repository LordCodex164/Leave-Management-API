import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existing) {
      throw new ConflictException(`User with email ${createUserDto.email} already exists`);
    }

    // If managerId is provided, validate that the manager exists and has correct roles
    if (createUserDto.managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: createUserDto.managerId },
      });

      if (!manager) {
        throw new NotFoundException(`Manager with ID ${createUserDto.managerId} not found`);
      }

      if (manager.role !== 'MANAGER' && manager.role !== 'ADMIN') {
        throw new BadRequestException(
          `User with ID ${createUserDto.managerId} is a ${manager.role} and cannot act as a manager`,
        );
      }
    }

    return this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        role: createUserDto.role,
        managerId: createUserDto.managerId || null,
        leaveBalance: createUserDto.leaveBalance ?? 20.0,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        subordinates: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        leaveRequests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async updateBalance(id: string, leaveBalance: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { leaveBalance },
    });
  }
}
