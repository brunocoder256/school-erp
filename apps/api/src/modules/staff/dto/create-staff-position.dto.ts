import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Staff position/designation creation — school is resolved from the active
 * school context. Positions are configurable: a school can define its own
 * designations (Head Teacher, ICT Coordinator, ...) without code changes.
 * They are not a hard-coded enum.
 */
export class CreateStaffPositionDto {
  @ApiProperty({ example: 'Head Teacher' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'HEAD_TEACHER' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({ example: 'Overall school administrator' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}