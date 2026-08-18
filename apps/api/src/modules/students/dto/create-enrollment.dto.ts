import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  AdmissionType,
  BoardingStatus,
  EnrollmentStatus,
} from '../../../../generated/prisma/enums';

/**
 * Enrollment creation nested under a student of the active school.
 * The student, school, academic year and class are resolved server-side.
 */
export class CreateEnrollmentDto {
  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a' })
  @IsUUID()
  academicYearId!: string;

  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b' })
  @IsUUID()
  academicClassId!: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c' })
  @IsOptional()
  @IsUUID()
  streamId?: string;

  @ApiPropertyOptional({
    enum: EnrollmentStatus,
    example: EnrollmentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @ApiProperty({ example: '2026-01-15' })
  @IsDateString()
  enrollmentDate!: string;

  @ApiPropertyOptional({ enum: AdmissionType, example: AdmissionType.NEW })
  @IsOptional()
  @IsEnum(AdmissionType)
  admissionType?: AdmissionType;

  @ApiPropertyOptional({ example: 'Kabale Primary School' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  previousSchool?: string;

  @ApiPropertyOptional({ example: 'P6' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  previousClass?: string;

  @ApiPropertyOptional({ enum: BoardingStatus, example: BoardingStatus.DAY })
  @IsOptional()
  @IsEnum(BoardingStatus)
  boardingStatus?: BoardingStatus;

  @ApiPropertyOptional({ example: 'Red House' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  house?: string;

  @ApiPropertyOptional({ example: 'Admitted after mid-term transfer.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;
}
