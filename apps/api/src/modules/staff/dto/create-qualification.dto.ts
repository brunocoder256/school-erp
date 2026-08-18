import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Staff qualification creation nested under a staff member of the active
 * school. Only the qualification name is required; all other fields are
 * optional. Uploaded certificate documents belong to a future document
 * management milestone — never store file blobs in this model.
 */
export class CreateQualificationDto {
  @ApiProperty({ example: 'Bachelor of Education' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Makerere University' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  institution?: string;

  @ApiPropertyOptional({ example: 'DEGREE' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  qualificationType?: string;

  @ApiPropertyOptional({ example: 'Mathematics Education' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fieldOfStudy?: string;

  @ApiPropertyOptional({ example: '2010-06-30' })
  @IsOptional()
  @IsDateString()
  awardDate?: string;

  @ApiPropertyOptional({ example: 'Second Class Honours (Upper)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  grade?: string;

  @ApiPropertyOptional({ example: 'MK-U-2010-00432' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  certificateNumber?: string;
}