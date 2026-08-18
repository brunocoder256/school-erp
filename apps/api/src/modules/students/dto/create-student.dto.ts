import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Gender, StudentStatus } from '../../../../generated/prisma/enums';

/**
 * Student creation — the school is never supplied by the client.
 * Tenant context is resolved exclusively from AuthenticatedUser.activeSchoolId.
 */
export class CreateStudentDto {
  @ApiProperty({ example: 'S-2026-001' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  admissionNumber!: string;

  @ApiProperty({ example: 'Grace' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Akello' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  middleName?: string;

  @ApiProperty({ example: 'Nakato' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  lastName!: string;

  @ApiPropertyOptional({ example: 'Gracie' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  preferredName?: string;

  @ApiProperty({ enum: Gender, example: Gender.FEMALE })
  @IsEnum(Gender)
  gender!: Gender;

  @ApiProperty({ example: '2014-03-12' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiPropertyOptional({ example: 'Kampala' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeOfBirth?: string;

  @ApiPropertyOptional({ example: 'Ugandan' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nationality?: string;

  @ApiPropertyOptional({ example: 'Protestant' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  religion?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/students/s-001.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  profilePhotoUrl?: string;

  @ApiPropertyOptional({ example: 'CFN012345678A' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationalId?: string;

  @ApiPropertyOptional({ example: 'BSC-2020-01234' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  birthCertificateNumber?: string;

  @ApiPropertyOptional({ example: '+256712345678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'grace.nakato@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Plot 5, Bombo Road, Kampala' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Kampala' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  district?: string;

  @ApiPropertyOptional({ example: 'Kampala Central' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  municipality?: string;

  @ApiPropertyOptional({ example: 'Kisenyi' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  village?: string;

  @ApiPropertyOptional({
    enum: StudentStatus,
    example: StudentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;
}
