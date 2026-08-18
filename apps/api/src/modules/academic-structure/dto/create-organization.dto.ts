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
 * Academic organization creation — the school is never supplied by the
 * client. Values such as THEMATIC, SUBJECT_BASED, COMPETENCY_BASED, MIXED and
 * CUSTOM are configurable data, not hard-coded enums.
 */
export class CreateOrganizationDto {
  @ApiProperty({ example: 'Competency-based' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'COMPETENCY_BASED' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({ example: 'Competency-based curriculum' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
