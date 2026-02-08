import { ConflictException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { CreatePropertyOwnerDto } from '../auth/dto/create.Property-owner.dto';
import { CreateAdminDto } from '../auth/dto/create-admin.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.user.findMany();
  }

  async findUserExists(phoneNumber: string, email: string) {
    return await this.prisma.user.findFirst({
      where: { OR: [{ email: email }, { phoneNumber: phoneNumber }] },
    });
  }

  async findUserByPhoneNumber(userPhoneNumber: string) {
    return this.prisma.user.findFirst({
      where: { phoneNumber: userPhoneNumber },
    });
  }

  async createAdmin(payload: CreateAdminDto) {
    return this.prisma.user.create({
      data: {
        fullName: payload.fullName,
        phoneNumber: payload.phoneNumber,
        email: payload.email,
        role: UserRole.ADMIN,
        adminProfile: { create: { createdBy: 'backend team' } },
      },
    });
  }

  async createPropertyOwner(dto: CreatePropertyOwnerDto) {
    const userExists = await this.prisma.user.findFirst({
      where: {
        OR: [{ phoneNumber: dto.phoneNumber }, { email: dto.email }],
      },
    });

    if (userExists) {
      if (userExists.phoneNumber === dto.phoneNumber) {
        throw new ConflictException(
          'A user with this phone number already exists',
        );
      }
      if (userExists.email === dto.email) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    const user = await this.prisma.user.create({
      data: {
        phoneNumber: dto.phoneNumber,
        fullName: dto.fullName,
        email: dto.email,
        pinCode: dto.pinCode,
        role: UserRole.PROPERTY_OWNER,
        isActive: true,
        propertyOwnerProfile: {
          create: {
            pinCode: dto.pinCode,
          },
        },
      },
    });

    return user;
  }

  async getPropertyOwnerDetails(userId: number) {
    const result = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        email: true,
        phoneNumber: true,
        propertyOwnerProfile: true,
      },
    });
  }
}
