import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Staff category creation — school is resolved from the active school context.
 * Categories are configurable: a school can define its own staff
 * classifications (e.g. Teaching, Support, Driver) without code changes.
 */
export class CreateStaffCategoryDto {
  @ApiProperty({ example: 'Teaching' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'TEACHING' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({ example: 'Staff who deliver lessons' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}