import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { RankingPolicyResponse } from '../dto/assessments-response.dto';
import { CreateRankingPolicyDto } from '../dto/create-ranking-policy.dto';
import { UpdateRankingPolicyDto } from '../dto/update-ranking-policy.dto';
import { requireActiveSchoolId } from './assessment-context.util';

/**
 * Ranking policy administration. Policies define how and where learners are
 * ranked (scope, metric method and tie handling). A policy is enabled when it
 * may be referenced by scheme versions.
 */
@Injectable()
export class RankingPoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    dto: CreateRankingPolicyDto,
  ): Promise<RankingPolicyResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    try {
      const policy = await this.prisma.rankingPolicy.create({
        data: {
          schoolId,
          name: dto.name,
          code: dto.code,
          enabled: dto.enabled ?? true,
          scope: dto.scope,
          method: dto.method ?? 'AVERAGE_SCORE',
          tieHandling: dto.tieHandling ?? 'COMPETITION',
          isActive: true,
        },
      });

      return this.mapPolicy(policy);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A ranking policy with this code already exists in this school.',
        );
      }

      throw error;
    }
  }

  async list(activeSchoolId: string | null): Promise<RankingPolicyResponse[]> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const policies = await this.prisma.rankingPolicy.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'asc' },
    });

    return policies.map((policy) => this.mapPolicy(policy));
  }

  async get(
    activeSchoolId: string | null,
    id: string,
  ): Promise<RankingPolicyResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const policy = await this.prisma.rankingPolicy.findFirst({
      where: { id, schoolId },
    });

    if (!policy) {
      throw new NotFoundException('Ranking policy not found.');
    }

    return this.mapPolicy(policy);
  }

  async update(
    activeSchoolId: string | null,
    id: string,
    dto: UpdateRankingPolicyDto,
  ): Promise<RankingPolicyResponse> {
    const schoolId = requireActiveSchoolId(activeSchoolId);

    const existing = await this.prisma.rankingPolicy.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Ranking policy not found.');
    }

    const data: {
      name?: string;
      code?: string;
      scope?: RankingPolicyResponse['scope'];
      method?: RankingPolicyResponse['method'];
      tieHandling?: RankingPolicyResponse['tieHandling'];
      enabled?: boolean;
      isActive?: boolean;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.code !== undefined) {
      data.code = dto.code;
    }

    if (dto.scope !== undefined) {
      data.scope = dto.scope;
    }

    if (dto.method !== undefined) {
      data.method = dto.method;
    }

    if (dto.tieHandling !== undefined) {
      data.tieHandling = dto.tieHandling;
    }

    if (dto.enabled !== undefined) {
      data.enabled = dto.enabled;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      const policy = await this.prisma.rankingPolicy.update({
        where: { id },
        data,
      });

      return this.mapPolicy(policy);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A ranking policy with this code already exists in this school.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Ranking policy not found.');
      }

      throw error;
    }
  }

  private mapPolicy(policy: {
    id: string;
    name: string;
    code: string;
    enabled: boolean;
    scope: string;
    method: string;
    tieHandling: string;
    isActive: boolean;
    schoolId: string;
    createdAt: Date;
    updatedAt: Date;
  }): RankingPolicyResponse {
    return {
      id: policy.id,
      name: policy.name,
      code: policy.code,
      enabled: policy.enabled,
      scope: policy.scope as RankingPolicyResponse['scope'],
      method: policy.method as RankingPolicyResponse['method'],
      tieHandling: policy.tieHandling as RankingPolicyResponse['tieHandling'],
      isActive: policy.isActive,
      schoolId: policy.schoolId,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }
}