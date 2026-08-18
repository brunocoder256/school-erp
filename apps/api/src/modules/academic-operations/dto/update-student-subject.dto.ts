import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Student subject enrollment update. Only the lifecycle may change; subject
 * enrollments are historical and never hard-deleted.
 */
export class UpdateStudentSubjectDto {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
