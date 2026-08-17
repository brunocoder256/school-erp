import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * School administration update — only editable profile fields.
 * IDs, code, memberships, roles, and timestamps are not client-writable.
 */
export class UpdateSchoolDto {
  @ApiPropertyOptional({ example: 'Kampala Primary School' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Primary school in Kampala' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}
