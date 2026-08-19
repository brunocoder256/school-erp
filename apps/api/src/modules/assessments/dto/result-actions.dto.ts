import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ResultActionDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  resultIds!: string[];
}

export class AmendResultDto {
  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a' })
  @IsUUID()
  resultId!: string;

  @ApiPropertyOptional({ example: 82 })
  @IsOptional()
  @IsNumber()
  finalScore?: number;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  grade?: string;

  @ApiPropertyOptional({ example: 'Excellent' })
  @IsOptional()
  @IsString()
  descriptor?: string;

  @ApiPropertyOptional({ example: 'Outstanding' })
  @IsOptional()
  @IsString()
  achievementLevel?: string;

  @ApiProperty({ example: 'Original score entry error.' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}