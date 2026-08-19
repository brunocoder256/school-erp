import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { Permissions } from '../../identity/decorators/permissions.decorator';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PermissionGuard } from '../../identity/guards/permission.guard';
import type { AuthenticatedUser } from '../../identity/types/authenticated-request';
import { CreateRankingPolicyDto } from '../dto/create-ranking-policy.dto';
import { UpdateRankingPolicyDto } from '../dto/update-ranking-policy.dto';
import { RankingPoliciesService } from '../services/ranking-policies.service';

@ApiTags('ranking-policies')
@ApiBearerAuth()
@Controller('ranking-policies')
export class RankingPoliciesController {
  constructor(private readonly rankingPoliciesService: RankingPoliciesService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('ranking_policies.create')
  @ApiOperation({ summary: 'Create a ranking policy' })
  @ApiCreatedResponse({ description: 'Created ranking policy' })
  @ApiForbiddenResponse({ description: 'Missing ranking_policies.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRankingPolicyDto,
  ) {
    return this.rankingPoliciesService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('ranking_policies.read')
  @ApiOperation({ summary: 'List ranking policies of the active school' })
  @ApiOkResponse({ description: 'Ranking policies of the active school' })
  @ApiForbiddenResponse({ description: 'Missing ranking_policies.read permission' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.rankingPoliciesService.list(user.activeSchoolId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('ranking_policies.read')
  @ApiOperation({ summary: 'Get a ranking policy' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Ranking policy' })
  @ApiNotFoundResponse({ description: 'Ranking policy does not belong to this school' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.rankingPoliciesService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('ranking_policies.update')
  @ApiOperation({ summary: 'Update or disable a ranking policy' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated ranking policy' })
  @ApiNotFoundResponse({ description: 'Ranking policy does not belong to this school' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRankingPolicyDto,
  ) {
    return this.rankingPoliciesService.update(user.activeSchoolId, id, dto);
  }
}