import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Teaching group update. The academic context (year, class, stream, subject)
 * is immutable once created; only the display name and lifecycle may change.
 */
export class UpdateTeachingGroupDto {
  @ApiPropertyOptional({ example: 'S3A Mathematics', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string | null;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
