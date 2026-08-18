import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SubjectCombinationsService } from './subject-combinations.service';

describe('SubjectCombinationsService', () => {
  let service: SubjectCombinationsService;
  let prisma: {
    academicLevel: { findFirst: jest.Mock };
    subject: { findMany: jest.Mock };
    subjectCombination: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    subjectCombinationSubject: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const schoolA = 'school-a';
  const schoolB = 'school-b';

  const levelA = { id: 'level-a', code: 'S6', schoolId: schoolA };
  const levelB = { id: 'level-b', code: 'S6', schoolId: schoolB };

  const subjectPhysics = { id: 'subject-physics', code: 'PHY', schoolId: schoolA };
  const subjectChem = { id: 'subject-chem', code: 'CHE', schoolId: schoolA };
  const subjectMath = { id: 'subject-math', code: 'MATH', schoolId: schoolA };
  const subjectForeign = { id: 'subject-foreign', code: 'HIS', schoolId: schoolB };

  const combinationA = {
    id: 'combination-a',
    code: 'PCM',
    name: 'Physics, Chemistry & Mathematics',
    description: null,
    minSubjects: 3,
    maxSubjects: 3,
    isActive: true,
    schoolId: schoolA,
    academicLevelId: levelA.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
  const combinationB = {
    id: 'combination-b',
    code: 'PCM',
    name: 'Physics, Chemistry & Mathematics',
    description: null,
    minSubjects: 3,
    maxSubjects: 3,
    isActive: true,
    schoolId: schoolB,
    academicLevelId: levelB.id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const createDto = {
    code: '  PCM  ',
    name: '  Physics, Chemistry & Mathematics  ',
    academicLevelId: levelA.id,
    minSubjects: 3,
    maxSubjects: 3,
    subjects: [
      { subjectId: subjectPhysics.id },
      { subjectId: subjectChem.id, isRequired: true },
      { subjectId: subjectMath.id, displayOrder: 1 },
    ],
  };

  beforeEach(async () => {
    prisma = {
      academicLevel: { findFirst: jest.fn() },
      subject: { findMany: jest.fn() },
      subjectCombination: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      subjectCombinationSubject: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectCombinationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SubjectCombinationsService);
  });

  function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('prisma error', {
      code,
      clientVersion: 'test',
    });
  }

  function mockSubjectsInSchool() {
    prisma.subject.findMany.mockResolvedValue([
      { id: subjectPhysics.id },
      { id: subjectChem.id },
      { id: subjectMath.id },
    ]);
  }

  describe('create', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.create(null, createDto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.subjectCombination.create).not.toHaveBeenCalled();
    });

    it('rejects a level of another school as not found', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(null);

      await expect(
        service.create(schoolA, { ...createDto, academicLevelId: levelB.id }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subjectCombination.create).not.toHaveBeenCalled();
    });

    it('rejects inverted min/max bounds', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);

      await expect(
        service.create(schoolA, { ...createDto, minSubjects: 4 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.subjectCombination.create).not.toHaveBeenCalled();
    });

    it('rejects a subject appearing more than once in the combination', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);

      await expect(
        service.create(schoolA, {
          ...createDto,
          subjects: [
            { subjectId: subjectPhysics.id },
            { subjectId: subjectPhysics.id },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.subjectCombination.create).not.toHaveBeenCalled();
    });

    it('rejects combination subjects that do not belong to the school', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      mockSubjectsInSchool();

      await expect(
        service.create(schoolA, {
          ...createDto,
          subjects: [
            { subjectId: subjectPhysics.id },
            { subjectId: subjectForeign.id },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.subjectCombination.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate code within the school', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      mockSubjectsInSchool();
      prisma.subjectCombination.findFirst.mockResolvedValue({
        id: combinationA.id,
      });

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.subjectCombination.create).not.toHaveBeenCalled();
    });

    it('creates a combination with its subjects', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      mockSubjectsInSchool();
      prisma.subjectCombination.findFirst.mockResolvedValue(null);
      prisma.subjectCombination.create.mockResolvedValue({
        ...combinationA,
        id: 'combination-c',
        code: 'PCM',
        name: 'Physics, Chemistry & Mathematics',
      });
      prisma.subjectCombinationSubject.findMany.mockResolvedValue([
        {
          subjectId: subjectMath.id,
          isRequired: false,
          displayOrder: 1,
        },
        {
          subjectId: subjectPhysics.id,
          isRequired: false,
          displayOrder: 2,
        },
        {
          subjectId: subjectChem.id,
          isRequired: true,
          displayOrder: 3,
        },
      ]);

      const result = await service.create(schoolA, createDto);

      expect(prisma.subjectCombination.create).toHaveBeenCalledWith({
        data: {
          schoolId: schoolA,
          academicLevelId: levelA.id,
          code: 'PCM',
          name: 'Physics, Chemistry & Mathematics',
          description: null,
          minSubjects: 3,
          maxSubjects: 3,
          isActive: true,
        },
        select: expect.any(Object),
      });
      expect(prisma.subjectCombinationSubject.deleteMany).toHaveBeenCalledWith({
        where: { combinationId: 'combination-c' },
      });
      expect(prisma.subjectCombinationSubject.createMany).toHaveBeenCalledWith({
        data: [
          {
            combinationId: 'combination-c',
            subjectId: subjectPhysics.id,
            isRequired: false,
            displayOrder: 1,
          },
          {
            combinationId: 'combination-c',
            subjectId: subjectChem.id,
            isRequired: true,
            displayOrder: 2,
          },
          {
            combinationId: 'combination-c',
            subjectId: subjectMath.id,
            isRequired: false,
            displayOrder: 1,
          },
        ],
      });
      expect(result.subjects).toHaveLength(3);
    });

    it('maps a P2002 race to a conflict', async () => {
      prisma.academicLevel.findFirst.mockResolvedValue(levelA);
      mockSubjectsInSchool();
      prisma.subjectCombination.findFirst.mockResolvedValue(null);
      prisma.subjectCombination.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(schoolA, createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('list', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.list(null)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lists only combinations of the active school with their subjects', async () => {
      prisma.subjectCombination.findMany.mockResolvedValue([combinationA]);
      prisma.subjectCombinationSubject.findMany.mockResolvedValue([]);

      const result = await service.list(schoolA);

      expect(prisma.subjectCombination.findMany).toHaveBeenCalledWith({
        where: { schoolId: schoolA },
        select: expect.any(Object),
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(combinationA.id);
      expect(result[0].subjects).toEqual([]);
    });
  });

  describe('get', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.get(null, combinationA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns a combination of the active school', async () => {
      prisma.subjectCombination.findFirst.mockResolvedValue(combinationA);
      prisma.subjectCombinationSubject.findMany.mockResolvedValue([
        { subjectId: subjectPhysics.id, isRequired: true, displayOrder: 1 },
      ]);

      const result = await service.get(schoolA, combinationA.id);

      expect(prisma.subjectCombination.findFirst).toHaveBeenCalledWith({
        where: { id: combinationA.id, schoolId: schoolA },
        select: expect.any(Object),
      });
      expect(result.id).toBe(combinationA.id);
      expect(result.subjects).toHaveLength(1);
    });

    it('reports a combination of another school as not found', async () => {
      prisma.subjectCombination.findFirst.mockResolvedValue(null);

      await expect(service.get(schoolA, combinationB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('rejects a missing active school context', async () => {
      await expect(
        service.update(null, combinationA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('reports updating a combination of another school as not found', async () => {
      prisma.subjectCombination.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, combinationB.id, { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subjectCombination.update).not.toHaveBeenCalled();
    });

    it('rejects inverted min/max bounds on update', async () => {
      prisma.subjectCombination.findFirst.mockResolvedValue({
        id: combinationA.id,
      });

      await expect(
        service.update(schoolA, combinationA.id, {
          minSubjects: 4,
          maxSubjects: 3,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.subjectCombination.update).not.toHaveBeenCalled();
    });

    it('rejects a level of another school on update', async () => {
      prisma.subjectCombination.findFirst.mockResolvedValue({
        id: combinationA.id,
      });
      prisma.academicLevel.findFirst.mockResolvedValue(null);

      await expect(
        service.update(schoolA, combinationA.id, {
          academicLevelId: levelB.id,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.subjectCombination.update).not.toHaveBeenCalled();
    });

    it('rejects foreign subjects when replacing the subject set', async () => {
      prisma.subjectCombination.findFirst.mockResolvedValue({
        id: combinationA.id,
      });
      mockSubjectsInSchool();

      await expect(
        service.update(schoolA, combinationA.id, {
          subjects: [{ subjectId: subjectForeign.id }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.subjectCombination.update).not.toHaveBeenCalled();
    });

    it('updates a combination and replaces its subjects when supplied', async () => {
      prisma.subjectCombination.findFirst.mockResolvedValue({
        id: combinationA.id,
      });
      prisma.subject.findMany.mockResolvedValue([
        { id: subjectPhysics.id },
      ]);
      prisma.subjectCombination.update.mockResolvedValue({
        ...combinationA,
        isActive: false,
      });
      prisma.subjectCombinationSubject.findMany.mockResolvedValue([]);

      const result = await service.update(schoolA, combinationA.id, {
        isActive: false,
        subjects: [{ subjectId: subjectPhysics.id }],
      });

      expect(prisma.subjectCombinationSubject.deleteMany).toHaveBeenCalledWith({
        where: { combinationId: combinationA.id },
      });
      expect(prisma.subjectCombinationSubject.createMany).toHaveBeenCalledWith({
        data: [
          {
            combinationId: combinationA.id,
            subjectId: subjectPhysics.id,
            isRequired: false,
            displayOrder: 1,
          },
        ],
      });
      expect(result.isActive).toBe(false);
      expect(result.subjects).toEqual([]);
    });

    it('maps a P2025 race to not found', async () => {
      prisma.subjectCombination.findFirst.mockResolvedValue({
        id: combinationA.id,
      });
      prisma.subjectCombination.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(schoolA, combinationA.id, { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('rejects a missing active school context', async () => {
      await expect(service.delete(null, combinationA.id)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('reports deleting a combination of another school as not found', async () => {
      prisma.subjectCombination.findFirst.mockResolvedValue(null);

      await expect(service.delete(schoolA, combinationB.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deletes a combination of the active school', async () => {
      prisma.subjectCombination.findFirst.mockResolvedValue({
        id: combinationA.id,
      });
      prisma.subjectCombination.delete.mockResolvedValue({});

      await service.delete(schoolA, combinationA.id);

      expect(prisma.subjectCombination.delete).toHaveBeenCalledWith({
        where: { id: combinationA.id },
      });
    });

    it('maps a P2025 race to not found', async () => {
      prisma.subjectCombination.findFirst.mockResolvedValue({
        id: combinationA.id,
      });
      prisma.subjectCombination.delete.mockRejectedValue(prismaError('P2025'));

      await expect(service.delete(schoolA, combinationA.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});