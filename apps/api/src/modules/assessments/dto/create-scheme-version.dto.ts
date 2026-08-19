import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateSchemeComponentDto } from './create-assessment-scheme.dto';

export class CreateSchemeVersionDto {
  @ApiPropertyOptional({ example: '2026 Term 2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    type: [CreateSchemeComponentDto],
    description:
      'Weighted components of the new version. Component weights must sum to 100.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSchemeComponentDto)
  components!: CreateSchemeComponentDto[];

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