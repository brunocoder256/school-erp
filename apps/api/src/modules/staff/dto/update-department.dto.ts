import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Department update — only editable fields. The school is never client-writable.
 */
export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Science & Technology' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'SCI' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({ example: 'Science subjects department', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}