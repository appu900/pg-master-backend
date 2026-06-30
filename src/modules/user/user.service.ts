import { ConflictException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import {
  normalizePhoneNumber,
  phoneNumbersEqual,
  phoneSearchVariants,
} from 'src/utils/phone.utils';
import { CreateAdminDto } from '../auth/dto/create-admin.dto';
import { CreatePropertyOwnerDto } from '../auth/dto/create.Property-owner.dto';


@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.user.findMany();
  }

  async findUserExists(phoneNumber: string, email: string) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const phoneVariants = phoneSearchVariants(normalizedPhone);
    return await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          ...(phoneVariants.length
            ? [{ phoneNumber: { in: phoneVariants } }]
            : []),
        ],
      },
    });
  }

  async findUserByPhoneNumber(userPhoneNumber: string) {
    const phoneVariants = phoneSearchVariants(userPhoneNumber);
    if (!phoneVariants.length) {
      return null;
    }
    return this.prisma.user.findFirst({
      where: { phoneNumber: { in: phoneVariants } },
    });
  }

  async createAdmin(payload: CreateAdminDto) {
    const phoneNumber = normalizePhoneNumber(payload.phoneNumber);
    const hashedPassword = await bcrypt.hash(payload.password, 10);
    return this.prisma.user.create({
      data: {
        fullName: payload.fullName,
        phoneNumber,
        email: payload.email,
        role: UserRole.ADMIN,
        adminProfile: { create: { createdBy: 'backend team', password: hashedPassword } },
      },
    });
  }

  async findAdminByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, role: UserRole.ADMIN },
      include: { adminProfile: true },
    });
  }

  async createPropertyOwner(dto: CreatePropertyOwnerDto) {
    const phoneNumber = normalizePhoneNumber(dto.phoneNumber);
    const phoneVariants = phoneSearchVariants(phoneNumber);
    const userExists = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(phoneVariants.length
            ? [{ phoneNumber: { in: phoneVariants } }]
            : []),
          { email: dto.email },
        ],
      },
    });

    if (userExists) {
      if (phoneNumbersEqual(userExists.phoneNumber, phoneNumber)) {
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
        phoneNumber,
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
