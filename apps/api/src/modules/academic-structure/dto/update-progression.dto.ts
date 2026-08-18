import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

/**
 * Academic level progression update — only editable fields. The school is
 * never client-writable.
 */
export class UpdateProgressionDto {
  @ApiPropertyOptional({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
  })
  @IsOptional()
  @IsUUID()
  fromLevelId?: string;

  @ApiPropertyOptional({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
  })
  @IsOptional()
  @IsUUID()
  toLevelId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
