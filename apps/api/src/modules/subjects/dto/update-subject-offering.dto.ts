import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

/**
 * Subject offering update — only editable fields. The school is never
 * client-writable.
 */
export class UpdateSubjectOfferingDto {
  @ApiPropertyOptional({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
  })
  @IsOptional()
  @IsUUID()
  academicLevelId?: string;

  @ApiPropertyOptional({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c',
  })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}