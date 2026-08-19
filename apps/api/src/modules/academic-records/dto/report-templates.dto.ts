import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReportTemplateSectionDto {
  @ApiProperty({ example: 'ACADEMIC_PERFORMANCE' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'Academic Performance' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class CreateReportTemplateDto {
  @ApiProperty({ example: 'Lower Secondary Term Report' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'LSC-TERM-REPORT' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ example: 'Standard lower secondary term report card.' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateReportTemplateVersionDto {
  @ApiPropertyOptional({ example: '2026 Term 1 layout' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Version number. Defaults to the next available number.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  versionNumber?: number;

  @ApiPropertyOptional({
    type: [ReportTemplateSectionDto],
    description: 'Sections that make up this template version.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReportTemplateSectionDto)
  sections?: ReportTemplateSectionDto[];
}

export class UpdateReportTemplateDto {
  @ApiPropertyOptional({ example: 'Lower Secondary Term Report' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'Lower secondary term report card.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
