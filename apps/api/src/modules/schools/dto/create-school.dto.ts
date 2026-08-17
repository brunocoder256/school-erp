import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSchoolDto {
  @ApiProperty({ example: 'Kampala Primary School' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    example: 'KLA-P',
    description: 'Unique school code (letters, numbers, hyphens, underscores)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message:
      'code must contain only letters, numbers, hyphens, and underscores',
  })
  code!: string;

  @ApiPropertyOptional({ example: 'Primary school in Kampala' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
