import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateGradingBandDto } from './create-grading-scheme.dto';

export class CreateGradingVersionDto {
  @ApiPropertyOptional({ example: '2026 Term 2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    type: [CreateGradingBandDto],
    description:
      'Bands of the new version. Bands must not overlap; gaps are allowed.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGradingBandDto)
  bands!: CreateGradingBandDto[];
}