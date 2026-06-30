import { IsArray, IsBoolean, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkReminderDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  tenantIds?: number[];

  @IsOptional()
  @IsBoolean()
  sendToAll?: boolean;
}

export interface BulkReminderResult {
  message: string;
  sent: number;
  skipped: number;
}
