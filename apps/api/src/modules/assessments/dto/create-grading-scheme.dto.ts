import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateGradingBandDto {
  @ApiProperty({ example: 80 })
  @IsNumber()
  @Min(0)
  @Max(100)
  minScore!: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  maxScore!: number;

  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  grade!: string;

  @ApiPropertyOptional({ example: 'Excellent' })
  @IsOptional()
  @IsString()
  descriptor?: string;

  @ApiPropertyOptional({ example: 'Outstanding' })
  @IsOptional()
  @IsString()
  achievementLevel?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class CreateGradingSchemeDto {
  @ApiProperty({ example: 'Lower Secondary Achievement' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'LSC-ACH' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: [CreateGradingBandDto],
    description:
      'Bands of the first version. Bands must not overlap; gaps are allowed and grade to nothing.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGradingBandDto)
  bands!: CreateGradingBandDto[];
}