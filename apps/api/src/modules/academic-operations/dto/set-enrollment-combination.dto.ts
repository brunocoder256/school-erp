import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

/**
 * Assigns a subject combination to a student's academic enrollment and, by
 * default, enrolls the combination's subjects for the student. The combination
 * must belong to the active school and its level must match the enrollment's
 * class level.
 */
export class SetEnrollmentCombinationDto {
  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a' })
  @IsUUID()
  subjectCombinationId!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  enrollSubjects?: boolean;
}
