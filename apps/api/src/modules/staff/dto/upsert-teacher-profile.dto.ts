import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Teacher profile upsert (create-or-update). Teacher-specific information is
 * separate from generic staff information and fully optional — a teacher can
 * exist without any qualification data entered. Professional registration is
 * optional and never hard-codes a particular registration authority.
 */
export class UpsertTeacherProfileDto {
  @ApiPropertyOptional({ example: 'Mathematics', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialization?: string | null;

  @ApiPropertyOptional({ example: 12, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  yearsOfExperience?: number | null;

  @ApiPropertyOptional({ example: 'Bachelor of Education', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  professionalQualification?: string | null;

  @ApiPropertyOptional({ example: 'UNT-2026-00123', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string | null;

  @ApiPropertyOptional({ example: 'Uganda National Teachers Union', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  registrationBody?: string | null;

  @ApiPropertyOptional({ example: '2020-01-15', nullable: true })
  @IsOptional()
  @IsDateString()
  registrationDate?: string | null;

  @ApiPropertyOptional({ example: '2027-01-15', nullable: true })
  @IsOptional()
  @IsDateString()
  registrationExpiryDate?: string | null;

  @ApiPropertyOptional({ example: 'ACTIVE', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationStatus?: string | null;

  @ApiPropertyOptional({ example: 'Master of Science in Education', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  highestAcademicQualification?: string | null;
}