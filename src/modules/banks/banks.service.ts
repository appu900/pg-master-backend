import {
  BadRequestException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { AddBankAccountDto, AddUPIdetailsDto } from './dto/add.backaccount.dto';
import { AccountDetailsType, payeeCategory } from '@prisma/client';

@Injectable()
export class BanksService {
  constructor(private readonly prisma: PrismaService) {}

  async addBankAccount(propertyOwnerId: number, dto: AddBankAccountDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: propertyOwnerId },
      select: {
        id: true,
        propertyOwnerProfile: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('user not found');
    const res = await this.prisma.bankAccountDetails.create({
      data: {
        propertyOwnerProfileId: user.propertyOwnerProfile!.id,
        accountHolderName: dto.accountHolderName,
        phoneNumber: dto.phoneNumber,
        PayeeCategory: dto.payeeCategory as payeeCategory,
        AccountNumber: dto.accountNumber,
        UPIId:dto.upiId ?? null,
        accountType: AccountDetailsType.BANKACCOUNT,
        IFSCcode: dto.IFSC_code,
      },
    });
    return {
      message: 'bank account added sucessfully',
    };
  }

  async addUpiId(propertyOwnerId: number, dto: AddUPIdetailsDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: propertyOwnerId },
      select: {
        id: true,
        propertyOwnerProfile: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('user not found');
    const res = await this.prisma.bankAccountDetails.create({
      data: {
        propertyOwnerProfileId: user.propertyOwnerProfile!.id,
        accountHolderName: dto.accountHolderName,
        phoneNumber: dto.phoneNumber,
        PayeeCategory: dto.payeeCategory as payeeCategory,
        UPIId: dto.UPIId,
        accountType: AccountDetailsType.BANKACCOUNT,
      },
    });
    return {
      message: 'UPI ACCOUnt added sucessfully',
    };
  }

  async fetchAllBankAccountsByPropertyOwner(propertyOwnerId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: propertyOwnerId },
      select: {
        id: true,
        propertyOwnerProfile: {
          select: {
            id: true,
          },
        },
      },
    });
    if(!user) throw new NotFoundException("user not found")
    const profileId = user.propertyOwnerProfile!.id
    const res = await this.prisma.bankAccountDetails.findMany({
        where:{propertyOwnerProfileId:profileId}
    })
    return {
        message:"all accounts fetched sucessfully",
        res
    }
  }
}
