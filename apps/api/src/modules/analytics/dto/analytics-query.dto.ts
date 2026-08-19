import { IsOptional, IsString, IsInt } from 'class-validator';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  academicClassId?: string;

  @IsOptional()
  @IsString()
  streamId?: string;

  @IsOptional()
  @IsString()
  studentStatus?: string;

  @IsOptional()
  @IsInt()
  limit?: number = 50;

  @IsOptional()
  @IsInt()
  offset?: number = 0;
}