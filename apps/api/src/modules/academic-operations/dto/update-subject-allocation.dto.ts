import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

/**
 * Subject allocation update. The academic year and class are fixed (the
 * allocation is historical); the stream, offering and lifecycle may change.
 * Deactivation is the lifecycle convention — allocations are never
 * hard-deleted.
 */
export class UpdateSubjectAllocationDto {
  @ApiPropertyOptional({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  streamId?: string | null;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d' })
  @IsOptional()
  @IsUUID()
  subjectOfferingId?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
