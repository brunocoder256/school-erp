import { ApiPropertyOptional } from '@nestjs/swagger';
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
 * Student update — only editable fields. The school and id are never
 * client-writable. Nullable optional fields may be cleared with an explicit
 * null; undefined means "leave unchanged".
 */
export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 'S-2026-001' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  admissionNumber?: string;

  @ApiPropertyOptional({ example: 'Grace' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Akello', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  middleName?: string | null;

  @ApiPropertyOptional({ example: 'Nakato' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Gracie', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  preferredName?: string | null;

  @ApiPropertyOptional({ enum: Gender, example: Gender.FEMALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '2014-03-12' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Kampala', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeOfBirth?: string | null;

  @ApiPropertyOptional({ example: 'Ugandan', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nationality?: string | null;

  @ApiPropertyOptional({ example: 'Protestant', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  religion?: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/students/s-001.jpg',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  profilePhotoUrl?: string | null;

  @ApiPropertyOptional({ example: 'CFN012345678A', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationalId?: string | null;

  @ApiPropertyOptional({ example: 'BSC-2020-01234', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  birthCertificateNumber?: string | null;

  @ApiPropertyOptional({ example: '+256712345678', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @ApiPropertyOptional({ example: 'grace.nakato@example.com', nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({
    example: 'Plot 5, Bombo Road, Kampala',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ example: 'Kampala', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  district?: string | null;

  @ApiPropertyOptional({ example: 'Kampala Central', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  municipality?: string | null;

  @ApiPropertyOptional({ example: 'Kisenyi', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  village?: string | null;

  @ApiPropertyOptional({
    enum: StudentStatus,
    example: StudentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;
}
