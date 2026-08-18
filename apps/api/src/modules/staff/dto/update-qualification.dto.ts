import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Staff qualification update — only editable fields. Nullable optional fields
 * may be cleared with an explicit null; undefined means "leave unchanged".
 */
export class UpdateQualificationDto {
  @ApiPropertyOptional({ example: 'Bachelor of Science in Education' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Kyambogo University', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  institution?: string | null;

  @ApiPropertyOptional({ example: 'DEGREE', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  qualificationType?: string | null;

  @ApiPropertyOptional({ example: 'Science Education', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fieldOfStudy?: string | null;

  @ApiPropertyOptional({ example: '2011-06-30', nullable: true })
  @IsOptional()
  @IsDateString()
  awardDate?: string | null;

  @ApiPropertyOptional({ example: 'Distinction', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  grade?: string | null;

  @ApiPropertyOptional({ example: 'KY-U-2011-00987', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  certificateNumber?: string | null;
}