import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * Student subject enrollment creation nested under a student's academic
 * enrollment. The subject must be offered at the enrollment's level/year and
 * allocated to the enrollment's class/stream.
 */
export class CreateStudentSubjectDto {
  @ApiProperty({ example: '5f6b6c1a-1b2c-4d5e-9f8a-7b6c5d4e3f2a' })
  @IsUUID()
  subjectId!: string;
}
