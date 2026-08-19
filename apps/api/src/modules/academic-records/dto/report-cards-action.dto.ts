import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ReportCommentAuthorType } from '../../../../generated/prisma/enums';

export class GenerateReportCardDto {
  @ApiProperty({
    description: 'The student (learner) for whom the report is generated.',
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
  })
  @IsUUID()
  studentId!: string;

  @ApiProperty({
    description: 'The academic year the report covers.',
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
  })
  @IsUUID()
  academicYearId!: string;

  @ApiPropertyOptional({
    description:
      'A specific term the report covers. Omit for an annual report. The academic context (class, stream, level, section) is resolved from the student enrollment.',
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c',
  })
  @IsOptional()
  @IsUUID()
  termId?: string;

  @ApiPropertyOptional({
    description:
      'The report template version to attach. Omit to generate without a template.',
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d',
  })
  @IsOptional()
  @IsUUID()
  templateVersionId?: string;
}

export class AmendReportCardDto {
  @ApiProperty({
    description: 'The reason for amending the issued report card.',
    example: 'Corrected subject grade after result recheck.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class AddReportCommentDto {
  @ApiProperty({
    description: 'The type of comment author.',
    enum: ReportCommentAuthorType,
    example: ReportCommentAuthorType.CLASS_TEACHER,
  })
  @IsEnum(ReportCommentAuthorType)
  authorType!: ReportCommentAuthorType;

  @ApiPropertyOptional({
    description:
      'The subject the comment relates to (required for SUBJECT_TEACHER comments).',
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c',
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({
    description: 'The comment text.',
    example: 'Grace has shown excellent improvement this term.',
  })
  @IsString()
  @IsNotEmpty()
  comment!: string;
}
