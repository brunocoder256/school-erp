import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  RankingMethod,
  RankingScope,
  RankingTieHandling,
} from '../../../../generated/prisma/enums';

export class CreateRankingPolicyDto {
  @ApiProperty({ example: 'Class Average Ranking' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'CLASS-AVG' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ enum: RankingScope, example: RankingScope.CLASS })
  @IsEnum(RankingScope)
  scope!: RankingScope;

  @ApiPropertyOptional({
    enum: RankingMethod,
    example: RankingMethod.AVERAGE_SCORE,
    default: RankingMethod.AVERAGE_SCORE,
  })
  @IsOptional()
  @IsEnum(RankingMethod)
  method?: RankingMethod;

  @ApiPropertyOptional({
    enum: RankingTieHandling,
    example: RankingTieHandling.COMPETITION,
    default: RankingTieHandling.COMPETITION,
  })
  @IsOptional()
  @IsEnum(RankingTieHandling)
  tieHandling?: RankingTieHandling;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}