import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PropertyownerService } from './propertyowner.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { AddBusinessDetails } from './dto/AddBusiness-details.dto';
import { GetUser } from 'src/common/decorators/Getuser.decorator';

@Controller('propertyowner')
export class PropertyownerController {
  constructor(private readonly serviceLayer: PropertyownerService) {}

  @Post('business-details')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'aadhaar', maxCount: 1 },
        { name: 'pan', maxCount: 1 },
        { name: 'companyDocument', maxCount: 1 },
      ],
      {
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
          const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'application/pdf',
          ];
          if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(
              new BadRequestException('Only jPG,PNG and PDF is allowed'),
              false,
            );
          }
          cb(null, true);
        },
      },
    ),
  )
  async addBusinessDetails(
    @Body() dto: AddBusinessDetails,
    @UploadedFiles()
    files: {
      aadhaar?: Express.Multer.File[];
      pan?: Express.Multer.File[];
      companyDocument?: Express.Multer.File[];
    },
    @GetUser() user:any
  ) {
     const propertyOwnerId = user.userId;
     if(!propertyOwnerId) throw new BadRequestException('Invalid user')
      const uploadedFiles: Express.Multer.File[] = [
      ...(files.aadhaar ?? []),
      ...(files.pan ?? []),
      ...(files.companyDocument ?? []),
    ];
    return this.serviceLayer.addBusinessDetails(propertyOwnerId,dto,uploadedFiles)
  }
}
