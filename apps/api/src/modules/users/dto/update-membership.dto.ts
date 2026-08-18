import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MembershipStatus } from '../../../../generated/prisma/enums';

export class UpdateMembershipDto {
  @ApiProperty({ enum: MembershipStatus, example: MembershipStatus.INACTIVE })
  @IsEnum(MembershipStatus)
  status!: MembershipStatus;
}
