import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

/**
 * Academic level progression creation. Both levels must belong to the active
 * school and must differ. The school is never supplied by the client.
 */
export class CreateProgressionDto {
  @ApiProperty({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a',
    description: 'The level learners progress FROM',
  })
  @IsUUID()
  fromLevelId!: string;

  @ApiProperty({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
    description: 'The level learners progress TO',
  })
  @IsUUID()
  toLevelId!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
