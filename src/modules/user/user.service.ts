import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { CreatePropertyOwnerDto } from '../auth/dto/create.Property-owner.dto';
import { User, UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}




  async findUserByPhoneNumber(userPhoneNumber:string){
    return this.prisma.user.findFirst({where:{phoneNumber:userPhoneNumber}})
  }
 

  async createPropertyOwner(dto: CreatePropertyOwnerDto) {
    const userExists = await this.prisma.user.findFirst({
      where: {
        OR: [{ phoneNumber: dto.phoneNumber }, { email: dto.email }],
      },
    });
    if (userExists) {
      throw new ConflictException('user exists with this phonenumber or email');
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
 