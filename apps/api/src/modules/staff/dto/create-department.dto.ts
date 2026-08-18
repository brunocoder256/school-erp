import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Department creation — school is resolved from the active school context.
 * Departments are optional school configuration: a school without departments
 * simply never creates them.
 */
export class CreateDepartmentDto {
  @ApiProperty({ example: 'Science' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'SCIENCE' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  code!: string;

  @ApiPropertyOptional({ example: 'Science subjects department' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
