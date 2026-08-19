import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { AssessmentType } from '../../../../generated/prisma/enums';

export class CreateAssessmentComponentDto {
  @ApiProperty({ example: 'Term End Examination' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'EXAM' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiPropertyOptional({
    example: 60,
    description:
      'Component weight in the scheme. Omit for an unweighted component (equal split).',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  weight?: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  maxScore!: number;
}

export class CreateAssessmentDto {
  @ApiProperty({ example: 'S5 Mathematics Term 1 Examination' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'S5-MATH-T1' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @ApiProperty({ enum: AssessmentType, example: AssessmentType.EXAMINATION })
  @IsEnum(AssessmentType)
  type!: AssessmentType;

  @ApiPropertyOptional({ example: '2026-04-20' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a' })
  @IsUUID()
  academicYearId!: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b' })
  @IsOptional()
  @IsUUID()
  termId?: string;

  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c' })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d' })
  @IsUUID()
  academicClassId!: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2e' })
  @IsOptional()
  @IsUUID()
  streamId?: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2f' })
  @IsOptional()
  @IsUUID()
  teachingGroupId?: string;

  @ApiPropertyOptional({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
    description:
      'Assessment scheme version that governs how this assessment is scored.',
  })
  @IsOptional()
  @IsUUID()
  schemeVersionId?: string;

  @ApiPropertyOptional({
    type: [CreateAssessmentComponentDto],
    description:
      'Components of the assessment. When omitted, a default "Total" component is created so scores always have a component to attach to.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAssessmentComponentDto)
  components?: CreateAssessmentComponentDto[];
}