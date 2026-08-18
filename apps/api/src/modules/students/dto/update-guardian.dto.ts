import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { GuardianRelationshipType } from '../../../../generated/prisma/enums';

/**
 * Guardian update — only editable fields. The student, guardian and school are
 * never client-writable. Nullable optional fields may be cleared with an
 * explicit null; undefined means "leave unchanged".
 */
export class UpdateGuardianDto {
  @ApiPropertyOptional({
    enum: GuardianRelationshipType,
    example: GuardianRelationshipType.MOTHER,
  })
  @IsOptional()
  @IsEnum(GuardianRelationshipType)
  relationshipType?: GuardianRelationshipType;

  @ApiPropertyOptional({ example: 'John Mukasa' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  fullName?: string;

  @ApiPropertyOptional({ example: '+256712345678', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @ApiPropertyOptional({ example: '+256700000000', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  alternatePhone?: string | null;

  @ApiPropertyOptional({ example: 'john.mukasa@example.com', nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({
    example: 'Plot 5, Bombo Road, Kampala',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ example: 'Teacher', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  occupation?: string | null;

  @ApiPropertyOptional({ example: 'PHONE', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredContactMethod?: string | null;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isEmergencyContact?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isAuthorizedPickup?: boolean;
}
