import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ExaminationStatus } from '../../../../generated/prisma/enums';

export class UpdateExaminationDto {
  @ApiPropertyOptional({ example: '2026 Term 1 Examinations' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'EXM-T1-2026' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: '2026-04-20' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: ExaminationStatus })
  @IsOptional()
  @IsEnum(ExaminationStatus)
  status?: ExaminationStatus;
}