import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

/**
 * Teacher subject capability creation. Capability answers "teacher can teach
 * subject X" — deliberately separate from "teacher is currently assigned to
 * teach subject X" (TeachingAssignment). A teacher may be capable of multiple
 * subjects without currently teaching them.
 */
export class CreateSubjectCapabilityDto {
  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a' })
  @IsUUID()
  subjectId!: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}