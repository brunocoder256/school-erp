import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

/**
 * Subject offering creation. An offering links a subject catalog entry to an
 * academic level and an academic year of the active school. The school is
 * never supplied by the client.
 */
export class CreateSubjectOfferingDto {
  @ApiProperty({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
    description: 'The subject from the school catalog',
  })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
    description: 'The academic level the subject is offered at',
  })
  @IsUUID()
  academicLevelId!: string;

  @ApiProperty({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c',
    description: 'The academic year the subject is offered in',
  })
  @IsUUID()
  academicYearId!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}