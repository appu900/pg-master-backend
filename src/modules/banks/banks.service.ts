import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { AddBankAccountDto, AddUPIdetailsDto } from './dto/add.backaccount.dto';
import { AccountDetailsType, payeeCategory, Prisma } from '@prisma/client';
import { UpdateBankAccountDto } from './dto/update.bankaccount.dto';

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
        UPIId: dto.upiId ?? null,
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
    if (!user) throw new NotFoundException('user not found');
    const profileId = user.propertyOwnerProfile!.id;
    const res = await this.prisma.bankAccountDetails.findMany({
      where: { propertyOwnerProfileId: profileId },
      select: {
        id:true,
        accountHolderName: true,
        accountType: true,
        PayeeCategory: true,
        linkedProperty: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return {
      message: 'all accounts fetched sucessfully',
      res,
    };
  }

  async updateAccountDetails(
    accountDetailsId: number,
    propertyownerId: number,
    dto: UpdateBankAccountDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: propertyownerId },
      select: { propertyOwnerProfile: { select: { id: true } } },
    });
    if (!user || !user.propertyOwnerProfile) {
      throw new ForbiddenException();
    }
    const profileId = user.propertyOwnerProfile.id;
    const accountDetails = await this.prisma.bankAccountDetails.findUnique({
      where: { id: accountDetailsId, propertyOwnerProfileId: profileId },
      select: { id: true, propertyOwnerProfileId: true },
    });
    if (!accountDetails) {
      throw new BadRequestException('no account details found');
    }

    let updatedData: Prisma.BankAccountDetailsUpdateInput = {};
    if (dto.accountHolderName)
      updatedData.accountHolderName = dto.accountHolderName;
    if (dto.AccountNumber) updatedData.AccountNumber = dto.AccountNumber;
    if (dto.phoneNumber) updatedData.phoneNumber = dto.phoneNumber;
    if (dto.PayeeCategory)
      updatedData.PayeeCategory = dto.PayeeCategory as payeeCategory;
    if (dto.UPIid) updatedData.UPIId = dto.UPIid;
    if (dto.IFSCcode) updatedData.IFSCcode = dto.IFSCcode;

    const res = await this.prisma.bankAccountDetails.update({
      where: { id: accountDetailsId },
      data: updatedData,
    });

    return {
      message: 'Account details updated sucessfully',
    };
  }

  async getAccountDetailsById(accountId: number) {
    const accountInformation = await this.prisma.bankAccountDetails.findUnique({
      where: { id: accountId },
    });
    if (!accountInformation) throw new NotFoundException('account not found');
    return accountInformation;
  }

  async linkPropertyToBankAccount(
    propertyOwnerId: number,
    propertyId: number,
    accountId: number,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: propertyOwnerId },
    });
    if (!user) throw new NotFoundException('user not found');
    const [property, bankAccount] = await Promise.all([
      this.prisma.property.findFirst({
        where: { id: propertyId, ownerId: propertyOwnerId },
      }),

      this.prisma.bankAccountDetails.findFirst({
        where: { id: accountId, profile: { userId: propertyOwnerId } },
      }),
    ]);
    if (!property) throw new NotFoundException('property not found');
    if (!bankAccount) throw new NotFoundException('Bank account not found');
    const updatedProperty = await this.prisma.property.update({
      where: { id: propertyId },
      data: { bankAccountId: bankAccount.id },
    });
    return {
      message: 'bank account linked sucessfully',
    };
  }

  async fetchAllLinkedAccounts(propertyOwnerId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: propertyOwnerId },
    });
    if (!user) throw new NotFoundException('user not found');
    const results = await this.prisma.property.findMany({
      where: { ownerId: propertyOwnerId },
      include: { bankAccount: true },
    });
    return results;
  }

  async fetchBankAccountById(bankAccountId: number) {
    const bankAccount = await this.prisma.bankAccountDetails.findFirst({
      where: {
        id: bankAccountId,
      },
      select:{
        id:true,
        accountHolderName:true,
        PayeeCategory:true,
        AccountNumber:true,
        IFSCcode:true,
        UPIId:true,
        accountType:true,
        createdAt:true,
        updatedAt:true,
        linkedProperty:{
          select:{
            id:true,
            name:true,
          }
        }
      }
    });
    return bankAccount;
  }
}
