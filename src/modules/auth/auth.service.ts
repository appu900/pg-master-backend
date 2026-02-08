import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import { OtpService } from 'src/infra/notification/OTP/otp.service';
import { UserService } from '../user/user.service';
import { OtpLoginDto } from './dto/auth.otp.login.dto';
import { CreatePropertyOwnerDto } from './dto/create.Property-owner.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { IsPhoneNumber } from 'class-validator';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma:PrismaService,
    private readonly userService: UserService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
  ) {}

  private async generateToken(user: User): Promise<{ access_token: string }> {
    try {
      const payload = { sub: user.id, role: user.role };
      return { access_token: this.jwtService.sign(payload) };
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate authentication token');
    }
  }
  async createPropertyOwner(dto: CreatePropertyOwnerDto) {
    try {
      const user = await this.userService.createPropertyOwner(dto);
      await this.otpService.sendOtp(user.phoneNumber);
      return {
        status: 'success',
        message: 'Please verify OTP to complete registration',
      };
    } catch (error) {
      throw error;
    }
  }

  async createAdmin(dto:CreateAdminDto){
     const exists = await this.userService.findUserExists(dto.phoneNumber,dto.email)
     if(exists) throw new ConflictException("User already exits")
     const res = await this.userService.createAdmin(dto);
     await this.otpService.sendOtp(res.phoneNumber)
     return{
      message:"admin created plaese verify the otp",
      phoneNumber:res.phoneNumber
     }
  }

  async sendOtp(phoneNumber: string) {
    const user = await this.userService.findUserByPhoneNumber(phoneNumber);
    
    if (!user) {
      throw new BadRequestException('User not found with this phone number');
    }
    
    if (user.isBlockedByAdmin) {
      throw new BadRequestException('Your account has been blocked by admin');
    }
    
    if (!user.isActive) {
      throw new BadRequestException('Your account is inactive');
    }
    
    await this.otpService.sendOtp(phoneNumber);
    return {
      status: 'success',
      message: 'OTP sent successfully',
      isBlockedByAdmin: false,
    };
  }



  async login(dto: OtpLoginDto) {
    try {
      // Verify OTP first
      await this.otpService.verifyOtp(dto.phoneNumber, dto.otp);
      
      // Get user details
      const user = await this.userService.findUserByPhoneNumber(
        dto.phoneNumber,
      );
      
      if (!user) {
        throw new BadRequestException('User not found');
      }
     
      if (user.isBlockedByAdmin) {
        throw new BadRequestException('Your account has been blocked by admin');
      }
      
      if (!user.isActive) {
        throw new BadRequestException('Your account is inactive');
      }
      
      // Generate token
      const token = await this.generateToken(user);
     

      return {
        message: 'Login successful',
        name: user.fullName,
        token,
        email: user.email,
        role: user.role,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Login failed. Please try again');
    }
  }
}
