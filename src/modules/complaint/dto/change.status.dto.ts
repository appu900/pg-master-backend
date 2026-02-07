import { ComplaintStatus } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsNotEmpty } from 'class-validator';

export class ChnageComplaintStatus {
  @IsEnum(ComplaintStatus)
  @IsNotEmpty()
  status: ComplaintStatus;

  @IsInt()
  @IsNotEmpty()
  complaintId: number;
}
