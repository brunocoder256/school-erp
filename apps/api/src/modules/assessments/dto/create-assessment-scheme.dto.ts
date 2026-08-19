import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSchemeComponentDto {
  @ApiProperty({ example: 'Continuous Assessment' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'CA' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiProperty({ example: 40 })
  @IsInt()
  @Min(0)
  @Max(100)
  weight!: number;

  @ApiProperty({ example: 40 })
  @IsNumber()
  @Min(0)
  maxScore!: number;
}

export class CreateAssessmentSchemeDto {
  @ApiProperty({ example: 'Lower Secondary Term Assessment' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'LSC-TERM' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: [CreateSchemeComponentDto],
    description:
      'Weighted components of the first version. Component weights must sum to 100. When omitted, a single 100% "Total" component is created.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSchemeComponentDto)
  components?: CreateSchemeComponentDto[];

  @ApiPropertyOptional({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
  })
  @IsOptional()
  @IsUUID()
  gradingSchemeVersionId?: string;

  @ApiPropertyOptional({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
  })
  @IsOptional()
  @IsUUID()
  rankingPolicyId?: string;
}