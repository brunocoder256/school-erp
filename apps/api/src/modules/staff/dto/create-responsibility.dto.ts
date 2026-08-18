import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
 * Staff responsibility creation nested under a staff member of the active
 * school. Responsibilities cover configurable roles such as class teacher or
 * head of department — the type is a school-defined label, never a hard-coded
 * enum. Assignments are academic-year scoped; class/stream/department are all
 * optional.
 */
export class CreateResponsibilityDto {
  @ApiProperty({ example: 'Class Teacher' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  type!: string;

  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a' })
  @IsUUID()
  academicYearId!: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c' })
  @IsOptional()
  @IsUUID()
  streamId?: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}