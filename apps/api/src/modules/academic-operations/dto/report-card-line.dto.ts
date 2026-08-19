import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ReportCardStatus } from '../../../../generated/prisma/enums';

export class ReportCardLineDto {
  @IsUUID()
  subjectId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  score: number;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsBoolean()
  isPassed?: boolean;

  @IsOptional()
  @IsString()
  teacherComment?: string;
}

export class CreateReportCardDto {
  @IsUUID()
  enrollmentId: string;

  @IsOptional()
  @IsEnum(ReportCardStatus)
  status?: ReportCardStatus;

  @IsOptional()
  @IsString()
  remarks?: string;

  @ValidateNested({ each: true })
  @Type(() => ReportCardLineDto)
  lines: ReportCardLineDto[];
}

export class UpdateReportCardDto {
  @IsOptional()
  @IsEnum(ReportCardStatus)
  status?: ReportCardStatus;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ReportCardLineDto)
  lines?: ReportCardLineDto[];
}
