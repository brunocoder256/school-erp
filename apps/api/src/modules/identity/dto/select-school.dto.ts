import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SelectSchoolDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  schoolId!: string;
}
