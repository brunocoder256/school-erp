import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { Permissions } from '../../identity/decorators/permissions.decorator';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PermissionGuard } from '../../identity/guards/permission.guard';
import type { AuthenticatedUser } from '../../identity/types/authenticated-request';
import { RankingsQueryDto } from '../dto/rankings-query.dto';
import { RankingsService } from '../services/rankings.service';

@ApiTags('rankings')
@ApiBearerAuth()
@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('rankings.read')
  @ApiOperation({
    summary: 'Rank learners using a ranking policy',
    description:
      'Ranks learners by their finalized (approved, locked or amended) results. Ties are handled deterministically per the policy.',
  })
  @ApiQuery({ name: 'policyId', required: true, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicClassId', required: false, type: String })
  @ApiQuery({ name: 'streamId', required: false, type: String })
  @ApiOkResponse({ description: 'Ranked learners' })
  @ApiForbiddenResponse({ description: 'Missing rankings.read permission' })
  compute(@CurrentUser() user: AuthenticatedUser, @Query() query: RankingsQueryDto) {
    return this.rankingsService.compute(user.activeSchoolId, query);
  }
}