import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CreatePropertyOwnerDto } from './dto/create.Property-owner.dto';
import { OtpService } from 'src/infra/notification/OTP/otp.service';
import { OtpLoginDto } from './dto/auth.otp.login.dto';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
  ) {}

  private async generateToken(user: User) {
    try {
      const payload = { sub: user.id, role: user.role };
      return { access_token: this.jwtService.sign(payload) };
    } catch (error) {
      console.log('Error in generating token', error);
    }
  }
  async createPropertyOwner(dto: CreatePropertyOwnerDto) {
    try {
      const user = await this.userService.createPropertyOwner(dto);
      await this.otpService.sendOtp(user.phoneNumber);
      console.log('propertyowner created', user);
      return {
        status: 'sucess',
        mesaage: 'please verify otp',
      };
    } catch (error) {
      console.log(
        'error occured while creating the propertyowner',
        error.message,
      );
      throw error;
    }
  }

  async sendOtp(phoneNumber: string) {
    const user = await this.userService.findUserByPhoneNumber(phoneNumber);
    if (!user) throw new BadRequestException('Invalid user phoneNuber');
    await this.otpService.sendOtp(phoneNumber);
    return {
      status: 'sucess',
      message: 'otp send sucessfully',
    };
  }

  async login(dto: OtpLoginDto) {
    try {
      await this.otpService.verifyOtp(dto.phoneNumber, dto.otp);
      const user = await this.userService.findUserByPhoneNumber(
        dto.phoneNumber,
      );
      if (!user) throw new BadRequestException();
      const token = await this.generateToken(user);
      console.log(token);
      return {
        message: 'login sucessful',
        name: user.fullName,
        token,
        email: user.email,
        role: user.role,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      } else {
        throw new InternalServerErrorException('Login failed please try again');
      }
    }
  }
}
