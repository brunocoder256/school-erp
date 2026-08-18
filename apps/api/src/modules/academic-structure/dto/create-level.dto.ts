import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';

/**
 * Academic level creation nested under a section of the active school.
 * Levels are configurable data (N1, P1-P7, S1-S6, ...) — never enums.
 */
export class CreateLevelDto {
  @ApiProperty({ example: 'Senior 2' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'S2' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  levelNumber!: number;

  @ApiPropertyOptional({ example: 'Second year of lower secondary' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  canEnroll?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isTerminal?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
    description: 'The academic organization model for this level',
  })
  @IsUUID()
  academicOrganizationId!: string;
}
