import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AssessmentStatus, AssessmentType } from '../../../../generated/prisma/enums';

export class UpdateAssessmentDto {
  @ApiPropertyOptional({ example: 'S5 Mathematics Term 1 Examination' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'S5-MATH-T1' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ enum: AssessmentType })
  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType;

  @ApiPropertyOptional({ example: '2026-04-20' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: AssessmentStatus })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;
}