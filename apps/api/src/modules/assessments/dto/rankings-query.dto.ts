import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RankingScope } from '../../../../generated/prisma/enums';

export class RankingsQueryDto {
  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a' })
  @IsUUID()
  policyId!: string;

  @ApiPropertyOptional({
    example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2b',
    description:
      'Required when ranking by a subject. For AGGREGATE/TOTAL methods this is ignored.',
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2c' })
  @IsOptional()
  @IsUUID()
  academicYearId?: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2d' })
  @IsOptional()
  @IsUUID()
  academicClassId?: string;

  @ApiPropertyOptional({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2e' })
  @IsOptional()
  @IsUUID()
  streamId?: string;

  @ApiPropertyOptional({
    enum: RankingScope,
    description: 'Override the policy scope for this ranking run.',
  })
  @IsOptional()
  @IsEnum(RankingScope)
  scope?: RankingScope;
}