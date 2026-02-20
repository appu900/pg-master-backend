import {
  Body,
  Controller,
  Post
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { OtpLoginDto } from './dto/auth.otp.login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreatePropertyOwnerDto } from './dto/create.Property-owner.dto';
import { SendOtpDto } from './dto/send.otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/property-owner/register')
  async createPropertyOwner(@Body() dto: CreatePropertyOwnerDto) {
    return this.authService.createPropertyOwner(dto);
  }

  @Post('/admin')
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.authService.createAdmin(dto);
  }

  @Post('/admin/login')
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Post('send-otp')
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phoneNumber);
  }

  @Post('login')
  async login(@Body() dto: OtpLoginDto) {
    return this.authService.login(dto);
  }
}
