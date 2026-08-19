import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ProgressionDecision } from '../../../../generated/prisma/enums';

export class UpdateStudentProgressionDto {
  @IsOptional()
  @IsEnum(ProgressionDecision)
  decision?: ProgressionDecision;

  @IsOptional()
  @IsUUID()
  toAcademicLevelId?: string;

  @IsOptional()
  @IsString()
  recommendation?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveDate?: Date;
}
