import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Gender, StaffStatus } from '../../../../generated/prisma/enums';

/**
 * Staff update — only editable fields. The school and id are never
 * client-writable. Nullable optional fields may be cleared with an explicit
 * null; undefined means "leave unchanged".
 */
export class UpdateStaffDto {
  @ApiPropertyOptional({ example: 'STF002' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  staffNumber?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Kato', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  middleName?: string | null;

  @ApiPropertyOptional({ example: 'Okello' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  lastName?: string;

  @ApiPropertyOptional({ example: 'JK', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  preferredName?: string | null;

  @ApiPropertyOptional({ example: 'john.okello@example.com', nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ example: '+256712345678', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @ApiPropertyOptional({ example: '+256772345678', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  alternativePhone?: string | null;

  @ApiPropertyOptional({ example: '1988-05-14', nullable: true })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE, nullable: true })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @ApiPropertyOptional({ example: 'CFN019876543M', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationalId?: string | null;

  @ApiPropertyOptional({ example: 'Plot 12, Mukono', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ enum: StaffStatus, example: StaffStatus.INACTIVE })
  @IsOptional()
  @IsEnum(StaffStatus)
  employmentStatus?: StaffStatus;

  @ApiPropertyOptional({ example: 'Contract', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  employmentType?: string | null;

  @ApiPropertyOptional({ example: '2015-02-01', nullable: true })
  @IsOptional()
  @IsDateString()
  joiningDate?: string | null;

  @ApiPropertyOptional({ example: '2026-12-31', nullable: true })
  @IsOptional()
  @IsDateString()
  leavingDate?: string | null;

  @ApiPropertyOptional({ example: 'Teaches Physics.', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a', nullable: true })
  @IsOptional()
  @IsUUID()
  staffCategoryId?: string | null;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b', nullable: true })
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c', nullable: true })
  @IsOptional()
  @IsUUID()
  positionId?: string | null;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d', nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string | null;
}
