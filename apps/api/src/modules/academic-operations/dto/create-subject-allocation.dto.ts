import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

/**
 * Subject allocation creation. Links a subject offering (which already pins
 * the subject, level and academic year) to an academic class and, optionally,
 * a stream of that class. A null stream means the subject is allocated to the
 * whole class.
 */
export class CreateSubjectAllocationDto {
  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a' })
  @IsUUID()
  academicYearId!: string;

  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b' })
  @IsUUID()
  academicClassId!: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c' })
  @IsOptional()
  @IsUUID()
  streamId?: string;

  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d' })
  @IsUUID()
  subjectOfferingId!: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
