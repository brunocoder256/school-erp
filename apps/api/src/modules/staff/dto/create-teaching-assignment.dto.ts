import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

/**
 * Teaching assignment creation. Connects a staff member (teacher) to an
 * academic year, subject and academic class, with an optional stream. Streams
 * remain optional because many schools/classes do not use them. The staff
 * member must be active to receive new assignments; historical assignments are
 * never destroyed by status changes.
 */
export class CreateTeachingAssignmentDto {
  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a' })
  @IsUUID()
  staffId!: string;

  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b' })
  @IsUUID()
  academicYearId!: string;

  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c' })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d' })
  @IsUUID()
  academicClassId!: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2e' })
  @IsOptional()
  @IsUUID()
  streamId?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}