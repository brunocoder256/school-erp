import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Staff responsibility update — only editable fields. Nullable optional
 * fields may be cleared with an explicit null; undefined means "leave
 * unchanged".
 */
export class UpdateResponsibilityDto {
  @ApiPropertyOptional({ example: 'Head of Department' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  type?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b', nullable: true })
  @IsOptional()
  @IsUUID()
  classId?: string | null;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c', nullable: true })
  @IsOptional()
  @IsUUID()
  streamId?: string | null;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d', nullable: true })
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;
}