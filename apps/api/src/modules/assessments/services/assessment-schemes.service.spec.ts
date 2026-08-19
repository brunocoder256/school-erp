import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AssessmentSchemesService } from './assessment-schemes.service';

describe('AssessmentSchemesService', () => {
  let service: AssessmentSchemesService;
  let prisma: {
    assessmentScheme: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    assessmentSchemeVersion: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock; updateMany: jest.Mock; findMany: jest.Mock };
    schemeComponentDefinition: { create: jest.Mock; findMany: jest.Mock };
    gradingSchemeVersion: { findFirst: jest.Mock };
    gradingScheme: { findFirst: jest.Mock };
    rankingPolicy: { findFirst: jest.Mock };
  };

  const school = 'school-a';
  const schemeId = 'scheme-a';

  beforeEach(async () => {
    prisma = {
      assessmentScheme: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      assessmentSchemeVersion: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
      schemeComponentDefinition: { create: jest.fn(), findMany: jest.fn() },
      gradingSchemeVersion: { findFirst: jest.fn() },
      gradingScheme: { findFirst: jest.fn() },
      rankingPolicy: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentSchemesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AssessmentSchemesService);
  });

  function schemeRow() {
    return {
      id: schemeId,
      name: 'Lower Secondary Term Assessment',
      code: 'LSC-TERM',
      description: null,
      isActive: true,
      schoolId: school,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('creates a scheme, its first active version and the components', async () => {
    prisma.assessmentScheme.create.mockResolvedValue(schemeRow());
    prisma.assessmentSchemeVersion.create.mockResolvedValue({
      id: 'version-a',
      versionNumber: 1,
      name: 'v1',
      status: 'ACTIVE',
      gradingSchemeVersionId: null,
      rankingPolicyId: null,
    });
    prisma.schemeComponentDefinition.create.mockResolvedValue({ id: 'def-a' });

    const result = await service.create(school, {
      name: 'Lower Secondary Term Assessment',
      code: 'LSC-TERM',
      components: [
        { name: 'Continuous Assessment', code: 'CA', weight: 40, maxScore: 40 },
        { name: 'Term End Examination', code: 'EXAM', weight: 60, maxScore: 100 },
      ],
    });

    expect(result.id).toBe(schemeId);
    expect(prisma.assessmentSchemeVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ versionNumber: 1, status: 'ACTIVE' }),
      }),
    );
    expect(prisma.schemeComponentDefinition.create).toHaveBeenCalledTimes(2);
  });

  it('creates a default 100% Total component when none are provided', async () => {
    prisma.assessmentScheme.create.mockResolvedValue(schemeRow());
    prisma.assessmentSchemeVersion.create.mockResolvedValue({
      id: 'version-a',
      versionNumber: 1,
      name: 'v1',
      status: 'ACTIVE',
      gradingSchemeVersionId: null,
      rankingPolicyId: null,
    });
    prisma.schemeComponentDefinition.create.mockResolvedValue({ id: 'def-a' });

    await service.create(school, { name: 'Scheme', code: 'SCHEME' });

    expect(prisma.schemeComponentDefinition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: 'TOTAL', weight: 100, maxScore: 100 }),
      }),
    );
  });

  it('rejects component weights that do not sum to 100', async () => {
    await expect(
      service.create(school, {
        name: 'Scheme',
        code: 'SCHEME',
        components: [{ name: 'CA', code: 'CA', weight: 30, maxScore: 40 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.assessmentScheme.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate scheme code', async () => {
    prisma.assessmentScheme.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create(school, { name: 'Scheme', code: 'LSC-TERM' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates the next version number for a new draft version', async () => {
    prisma.assessmentScheme.findFirst.mockResolvedValue({ id: schemeId });
    prisma.assessmentSchemeVersion.findFirst.mockResolvedValue({ versionNumber: 2 });
    prisma.assessmentSchemeVersion.create.mockResolvedValue({
      id: 'version-b',
      versionNumber: 3,
      name: '2026 Term 2',
      status: 'DRAFT',
      gradingSchemeVersionId: null,
      rankingPolicyId: null,
    });
    prisma.schemeComponentDefinition.create.mockResolvedValue({ id: 'def-a' });
    prisma.schemeComponentDefinition.findMany.mockResolvedValue([]);

    await service.createVersion(school, schemeId, {
      name: '2026 Term 2',
      components: [{ name: 'CA', code: 'CA', weight: 100, maxScore: 100 }],
    });

    expect(prisma.assessmentSchemeVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ versionNumber: 3, status: 'DRAFT' }),
      }),
    );
  });

  it('activates a version and archives the previously active one', async () => {
    prisma.assessmentScheme.findFirst.mockResolvedValue({ id: schemeId });
    prisma.assessmentSchemeVersion.findFirst
      .mockResolvedValueOnce({ id: 'version-b', versionNumber: 3, name: '2026 Term 2', status: 'DRAFT', gradingSchemeVersionId: null, rankingPolicyId: null, assessmentSchemeId: schemeId })
      .mockResolvedValueOnce({ id: 'version-b', versionNumber: 3, name: '2026 Term 2', status: 'ACTIVE', gradingSchemeVersionId: null, rankingPolicyId: null, assessmentSchemeId: schemeId });
    prisma.assessmentSchemeVersion.update.mockResolvedValue({ id: 'version-b' });
    prisma.schemeComponentDefinition.findMany.mockResolvedValue([]);

    const result = await service.activateVersion(school, schemeId, 'version-b');

    expect(prisma.assessmentSchemeVersion.updateMany).toHaveBeenCalledWith({
      where: { assessmentSchemeId: schemeId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED' },
    });
    expect(prisma.assessmentSchemeVersion.update).toHaveBeenCalledWith({
      where: { id: 'version-b' },
      data: { status: 'ACTIVE' },
    });
    expect(result.status).toBe('ACTIVE');
  });

  it('throws when getting a scheme of another school', async () => {
    prisma.assessmentScheme.findFirst.mockResolvedValue(null);

    await expect(service.get(school, schemeId)).rejects.toBeInstanceOf(NotFoundException);
  });
});