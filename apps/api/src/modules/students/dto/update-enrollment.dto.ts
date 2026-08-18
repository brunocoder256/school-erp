import { ApiPropertyOptional } from '@nestjs/swagger';
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
 * Enrollment update — only editable fields. The student, academic year and
 * school are never client-writable. Nullable optional fields may be cleared
 * with an explicit null; undefined means "leave unchanged".
 */
export class UpdateEnrollmentDto {
  @ApiPropertyOptional({
    enum: EnrollmentStatus,
    example: EnrollmentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @ApiPropertyOptional({ example: '2026-01-20' })
  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @ApiPropertyOptional({ enum: AdmissionType, example: AdmissionType.NEW })
  @IsOptional()
  @IsEnum(AdmissionType)
  admissionType?: AdmissionType;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b' })
  @IsOptional()
  @IsUUID()
  academicClassId?: string;

  @ApiPropertyOptional({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  streamId?: string | null;

  @ApiPropertyOptional({ example: 'Kabale Primary School', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  previousSchool?: string | null;

  @ApiPropertyOptional({ example: 'P6', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  previousClass?: string | null;

  @ApiPropertyOptional({ enum: BoardingStatus, nullable: true })
  @IsOptional()
  @IsEnum(BoardingStatus)
  boardingStatus?: BoardingStatus | null;

  @ApiPropertyOptional({ example: 'Red House', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  house?: string | null;

  @ApiPropertyOptional({
    example: 'Admitted after mid-term transfer.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string | null;

  @ApiPropertyOptional({ example: '2026-11-30', nullable: true })
  @IsOptional()
  @IsDateString()
  withdrawalDate?: string | null;

  @ApiPropertyOptional({ example: 'Family relocated', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  withdrawalReason?: string | null;

  @ApiPropertyOptional({ example: '2026-12-10', nullable: true })
  @IsOptional()
  @IsDateString()
  completedDate?: string | null;
}
