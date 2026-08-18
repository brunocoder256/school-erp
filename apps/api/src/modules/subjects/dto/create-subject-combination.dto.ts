import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CombinationSubjectInput {
  @ApiProperty({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
    description: 'A subject from the school catalog',
  })
  @IsUUID()
  subjectId!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

/**
 * Subject combination / pathway creation — the school is never supplied by
 * the client. Combinations (PCM, PCB, ...) are configurable data.
 */
export class CreateSubjectCombinationDto {
  @ApiProperty({ example: 'PCM' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'Physics, Chemistry and Mathematics' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Science combination' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
    description: 'The academic level the combination applies to',
  })
  @IsUUID()
  academicLevelId!: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSubjects?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @ValidateIf((dto: CreateSubjectCombinationDto) => dto.minSubjects !== undefined)
  maxSubjects?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: [
      { subjectId: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a', isRequired: true },
    ],
    description: 'Subjects that make up the combination',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CombinationSubjectInput)
  subjects?: CombinationSubjectInput[];
}