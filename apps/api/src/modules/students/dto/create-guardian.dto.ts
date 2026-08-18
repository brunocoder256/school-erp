import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
 * Guardian creation nested under a student of the active school.
 * The school is never supplied by the client.
 */
export class CreateGuardianDto {
  @ApiProperty({
    enum: GuardianRelationshipType,
    example: GuardianRelationshipType.FATHER,
  })
  @IsEnum(GuardianRelationshipType)
  relationshipType!: GuardianRelationshipType;

  @ApiProperty({ example: 'John Mukasa' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  fullName!: string;

  @ApiPropertyOptional({ example: '+256712345678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: '+256700000000' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'john.mukasa@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Plot 5, Bombo Road, Kampala' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Teacher' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  occupation?: string;

  @ApiPropertyOptional({ example: 'PHONE' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredContactMethod?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isEmergencyContact?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isAuthorizedPickup?: boolean;
}
