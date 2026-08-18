import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CreateStreamDto } from '../dto/create-stream.dto';
import type { StreamResponse } from '../dto/stream-response.dto';
import { UpdateStreamDto } from '../dto/update-stream.dto';

const STREAM_SELECT = {
  id: true,
  name: true,
  code: true,
  capacity: true,
  isActive: true,
  classId: true,
  createdAt: true,
  updatedAt: true,
};

/**
 * Stream administration nested under a class of the active school.
 *
 * The existing Stream model is reused (no duplicate). Every operation
 * verifies the parent class belongs to the active school (safe 404). Schools
 * that do not use streams simply never create them.
 */
@Injectable()
export class StreamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    activeSchoolId: string | null,
    classId: string,
    dto: CreateStreamDto,
  ): Promise<StreamResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireClassInSchool(schoolId, classId);

    const name = dto.name.trim();
    const code = dto.code.trim();

    const existing = await this.prisma.stream.findFirst({
      where: { classId, code },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'A stream with this code already exists in this class.',
      );
    }

    try {
      return await this.prisma.stream.create({
        data: {
          classId,
          name,
          code,
          capacity: dto.capacity ?? null,
          isActive: dto.isActive ?? true,
        },
        select: STREAM_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A stream with this code already exists in this class.',
        );
      }

      throw error;
    }
  }

  async list(
    activeSchoolId: string | null,
    classId: string,
  ): Promise<StreamResponse[]> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireClassInSchool(schoolId, classId);

    return this.prisma.stream.findMany({
      where: { classId },
      select: STREAM_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async get(
    activeSchoolId: string | null,
    classId: string,
    streamId: string,
  ): Promise<StreamResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireClassInSchool(schoolId, classId);

    const stream = await this.prisma.stream.findFirst({
      where: { id: streamId, classId },
      select: STREAM_SELECT,
    });

    if (!stream) {
      throw new NotFoundException('Stream not found.');
    }

    return stream;
  }

  async update(
    activeSchoolId: string | null,
    classId: string,
    streamId: string,
    dto: UpdateStreamDto,
  ): Promise<StreamResponse> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireClassInSchool(schoolId, classId);

    const existing = await this.prisma.stream.findFirst({
      where: { id: streamId, classId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Stream not found.');
    }

    const data: {
      name?: string;
      code?: string;
      capacity?: number | null;
      isActive?: boolean;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.code !== undefined) {
      data.code = dto.code.trim();
    }

    if (dto.capacity !== undefined) {
      if (dto.capacity === null) {
        throw new BadRequestException(
          'capacity cannot be cleared once set.',
        );
      }

      data.capacity = dto.capacity;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.stream.update({
        where: { id: streamId },
        data,
        select: STREAM_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A stream with this code already exists in this class.',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Stream not found.');
      }

      throw error;
    }
  }

  async delete(
    activeSchoolId: string | null,
    classId: string,
    streamId: string,
  ): Promise<void> {
    const schoolId = this.requireActiveSchoolId(activeSchoolId);
    await this.requireClassInSchool(schoolId, classId);

    const stream = await this.prisma.stream.findFirst({
      where: { id: streamId, classId },
      select: { id: true, _count: { select: { enrollments: true } } },
    });

    if (!stream) {
      throw new NotFoundException('Stream not found.');
    }

    if (stream._count.enrollments > 0) {
      throw new ConflictException(
        'Cannot delete a stream that still has enrollments.',
      );
    }

    try {
      await this.prisma.stream.delete({ where: { id: streamId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Stream not found.');
      }

      throw error;
    }
  }

  /**
   * Verifies the parent class belongs to the active school (safe 404).
   */
  private async requireClassInSchool(
    schoolId: string,
    classId: string,
  ): Promise<void> {
    const academicClass = await this.prisma.academicClass.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    });

    if (!academicClass) {
      throw new NotFoundException('Academic class not found.');
    }
  }

  private requireActiveSchoolId(activeSchoolId: string | null): string {
    if (!activeSchoolId) {
      throw new ForbiddenException(
        'Active school context is required for this operation.',
      );
    }

    return activeSchoolId;
  }
}
