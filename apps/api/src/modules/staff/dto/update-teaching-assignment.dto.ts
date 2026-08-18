import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

/**
 * Teaching assignment update. The assignment identity (staff, year, subject)
 * is fixed; the class and stream may change within the active school, and the
 * assignment may be deactivated instead of deleted so history survives.
 */
export class UpdateTeachingAssignmentDto {
  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d' })
  @IsOptional()
  @IsUUID()
  academicClassId?: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2e', nullable: true })
  @IsOptional()
  @IsUUID()
  streamId?: string | null;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}