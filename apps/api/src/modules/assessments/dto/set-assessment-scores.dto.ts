import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AssessmentScoreStatus } from '../../../../generated/prisma/enums';

export class SetAssessmentScoreDto {
  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a' })
  @IsUUID()
  enrollmentId!: string;

  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b' })
  @IsUUID()
  componentId!: string;

  @ApiPropertyOptional({
    example: 78.8,
    description:
      'Required when status is PRESENT. Absent learners have no score (absent is not zero).',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9999)
  score?: number;

  @ApiPropertyOptional({
    enum: AssessmentScoreStatus,
    example: AssessmentScoreStatus.PRESENT,
    default: AssessmentScoreStatus.PRESENT,
  })
  @IsOptional()
  @IsEnum(AssessmentScoreStatus)
  status?: AssessmentScoreStatus;

  @ApiPropertyOptional({ example: 'Excused by the head teacher.' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class SetAssessmentScoresDto {
  @ApiProperty({ type: [SetAssessmentScoreDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SetAssessmentScoreDto)
  entries!: SetAssessmentScoreDto[];
}