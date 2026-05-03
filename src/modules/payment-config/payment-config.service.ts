import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { CreatePaymentConfigDto } from './dto/create-payment-config.dto';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto';

@Injectable()
export class PaymentConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async create(propertyId: number, dto: CreatePaymentConfigDto) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Property not found');

    const existing = await this.prisma.propertyPaymentGatewayConfig.findUnique({
      where: { propertyId },
    });
    if (existing) throw new ConflictException('Payment config already exists for this property. Use update instead.');

    return this.prisma.propertyPaymentGatewayConfig.create({
      data: {
        propertyId,
        merchantKey: dto.merchantKey,
        merchantSalt: dto.merchantSalt,
        environment: dto.environment ?? 'TEST',
      },
      select: {
        id: true,
        propertyId: true,
        environment: true,
        isActive: true,
        createdAt: true,
        // salt is never returned
      },
    });
  }

  async findByProperty(propertyId: number) {
    const config = await this.prisma.propertyPaymentGatewayConfig.findUnique({
      where: { propertyId },
      select: {
        id: true,
        propertyId: true,
        environment: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        property: { select: { name: true } },
      },
    });
    if (!config) throw new NotFoundException('No payment config found for this property');
    return config;
  }

  async update(propertyId: number, dto: UpdatePaymentConfigDto) {
    const config = await this.prisma.propertyPaymentGatewayConfig.findUnique({
      where: { propertyId },
    });
    if (!config) throw new NotFoundException('No payment config found for this property');

    return this.prisma.propertyPaymentGatewayConfig.update({
      where: { propertyId },
      data: {
        ...(dto.merchantKey && { merchantKey: dto.merchantKey }),
        ...(dto.merchantSalt && { merchantSalt: dto.merchantSalt }),
        ...(dto.environment && { environment: dto.environment }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: {
        id: true,
        propertyId: true,
        environment: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async listAll() {
    return this.prisma.propertyPaymentGatewayConfig.findMany({
      select: {
        id: true,
        propertyId: true,
        environment: true,
        isActive: true,
        createdAt: true,
        property: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Internal: used by payment service — returns key + salt
  async getConfigForPayment(propertyId: number) {
    const config = await this.prisma.propertyPaymentGatewayConfig.findUnique({
      where: { propertyId },
    });
    if (!config) throw new NotFoundException('Payment gateway not configured for this property');
    if (!config.isActive) throw new NotFoundException('Payment gateway is disabled for this property');
    return config;
  }
}
