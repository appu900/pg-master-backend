import { Body, Controller, Get, Logger, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { CashfreeVerificationService } from './cashfree.digilocker.service';




@Controller('digilocker')
export class DigilockerController {
  private readonly logger = new Logger(DigilockerController.name);

  constructor(private readonly digilockerService: CashfreeVerificationService) {}

  @Post('/verify-account')
  async verifyAccount(
    @Body('verification_id') verificationId: string,
    @Body('mobile_number') mobileNumber?: string,
    @Body('aadhaar_number') aadhaarNumber?: string,
  ) {
    return this.digilockerService.verifyAccount(verificationId, mobileNumber, aadhaarNumber);
  }

  @Post('/start')
  async createDigilockerUrl(@Body('redirect_url') redirectUrl: string) {
    const verificationId = randomUUID();
    const result = await this.digilockerService.createDigilockerUrl(verificationId, redirectUrl) as Record<string, unknown>;
    return { verification_id: verificationId, ...result };
  }

  @Get('/status')
  async getVerificationStatus(@Query('verification_id') verificationId: string) {
    return this.digilockerService.getVerificationStatus(verificationId);
  }

  @Get('/document/aadhaar')
  async getAadhaar(@Query('verification_id') verificationId: string) {
    return this.digilockerService.getAadhaar(verificationId);
  }

  @Get('/document/pan')
  async getPan(@Query('verification_id') verificationId: string) {
    return this.digilockerService.getPan(verificationId);
  }

  @Get('/document/driving-license')
  async getDrivingLicense(@Query('verification_id') verificationId: string) {
    return this.digilockerService.getDrivingLicense(verificationId);
  }

  @Get('/documents')
  async fetchKycDocuments(@Query('verification_id') verificationId: string) {
    return this.digilockerService.fetchKycDocuments(verificationId);
  }

  @Get('/callback')
  async callback(
    @Query('verification_id') verificationId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Digilocker callback received for verification_id: ${verificationId}`);
    try {
      await this.digilockerService.fetchKycDocuments(verificationId);
      return res.redirect(`${process.env.FRONTEND_URL}/kyc-success`);
    } catch (error) {
      this.logger.error(`KYC callback failed for ${verificationId}`, error);
      return res.redirect(`${process.env.FRONTEND_URL}/kyc-failed`);
    }
  }
}
