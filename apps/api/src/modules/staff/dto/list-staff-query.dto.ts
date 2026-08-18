import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { StaffStatus } from '../../../../generated/prisma/enums';

/**
 * Optional filters for listing staff of the active school. The school itself
 * is always the authenticated active school — never a client query parameter.
 */
export class ListStaffQueryDto {
  @ApiPropertyOptional({ enum: StaffStatus, example: StaffStatus.ACTIVE })
  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a' })
  @IsOptional()
  @IsUUID()
  staffCategoryId?: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'Okello' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
