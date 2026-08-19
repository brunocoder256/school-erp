import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import {
  RankingMethod,
  RankingScope,
  RankingTieHandling,
} from '../../../../generated/prisma/enums';

export class UpdateRankingPolicyDto {
  @ApiPropertyOptional({ example: 'Class Average Ranking' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'CLASS-AVG' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ enum: RankingScope, example: RankingScope.CLASS })
  @IsOptional()
  @IsEnum(RankingScope)
  scope?: RankingScope;

  @ApiPropertyOptional({ enum: RankingMethod, example: RankingMethod.AVERAGE_SCORE })
  @IsOptional()
  @IsEnum(RankingMethod)
  method?: RankingMethod;

  @ApiPropertyOptional({
    enum: RankingTieHandling,
    example: RankingTieHandling.COMPETITION,
  })
  @IsOptional()
  @IsEnum(RankingTieHandling)
  tieHandling?: RankingTieHandling;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}