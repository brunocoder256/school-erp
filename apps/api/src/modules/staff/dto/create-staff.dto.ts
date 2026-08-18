import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
 * Staff creation — the school is never supplied by the client. Tenant context
 * is resolved exclusively from AuthenticatedUser.activeSchoolId. A staff
 * record represents a person employed/working at the school; it is distinct
 * from a User (application identity). Every field beyond the minimal identity
 * is optional so small schools can use the system without extra data.
 */
export class CreateStaffDto {
  @ApiProperty({ example: 'STF001' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  staffNumber!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Kato' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  middleName?: string;

  @ApiProperty({ example: 'Okello' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  lastName!: string;

  @ApiPropertyOptional({ example: 'JK' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  preferredName?: string;

  @ApiPropertyOptional({ example: 'john.okello@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+256712345678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: '+256772345678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  alternativePhone?: string;

  @ApiPropertyOptional({ example: '1988-05-14' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: 'CFN019876543M' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationalId?: string;

  @ApiPropertyOptional({ example: 'Plot 12, Mukono' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ enum: StaffStatus, example: StaffStatus.ACTIVE })
  @IsOptional()
  @IsEnum(StaffStatus)
  employmentStatus?: StaffStatus;

  @ApiPropertyOptional({ example: 'Permanent' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  employmentType?: string;

  @ApiPropertyOptional({ example: '2015-02-01' })
  @IsOptional()
  @IsDateString()
  joiningDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  leavingDate?: string;

  @ApiPropertyOptional({ example: 'Teaches Physics and Mathematics.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a' })
  @IsOptional()
  @IsUUID()
  staffCategoryId?: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c' })
  @IsOptional()
  @IsUUID()
  positionId?: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
