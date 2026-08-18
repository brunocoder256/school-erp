import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { Permissions } from '../../identity/decorators/permissions.decorator';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PermissionGuard } from '../../identity/guards/permission.guard';
import type { AuthenticatedUser } from '../../identity/types/authenticated-request';
import { CreateTeachingGroupDto } from '../dto/create-teaching-group.dto';
import { ListTeachingGroupsQueryDto } from '../dto/list-teaching-groups-query.dto';
import { UpdateTeachingGroupDto } from '../dto/update-teaching-group.dto';
import { TeachingGroupsService } from '../services/teaching-groups.service';

/**
 * Teaching group administration for the authenticated user's active school.
 * Groups are the stable operational units that later milestones will consume;
 * they are deactivated, never hard-deleted.
 */
@ApiTags('teaching-groups')
@ApiBearerAuth()
@Controller('teaching-groups')
export class TeachingGroupsController {
  constructor(private readonly teachingGroupsService: TeachingGroupsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('teaching_groups.create')
  @ApiOperation({ summary: 'Create a teaching group for a class/stream' })
  @ApiCreatedResponse({ description: 'Created teaching group' })
  @ApiForbiddenResponse({
    description: 'Missing teaching_groups.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTeachingGroupDto,
  ) {
    return this.teachingGroupsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('teaching_groups.read')
  @ApiOperation({
    summary: 'List teaching groups of the active school',
    description:
      'Optional filters by academic year, class, stream or subject.',
  })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicClassId', required: false, type: String })
  @ApiQuery({ name: 'streamId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiOkResponse({ description: 'Teaching groups of the active school' })
  @ApiForbiddenResponse({
    description: 'Missing teaching_groups.read permission',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTeachingGroupsQueryDto,
  ) {
    return this.teachingGroupsService.list(user.activeSchoolId, query);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('teaching_groups.read')
  @ApiOperation({ summary: 'Get a teaching group of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Teaching group' })
  @ApiNotFoundResponse({
    description: 'Teaching group does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing teaching_groups.read permission',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teachingGroupsService.get(user.activeSchoolId, id);
  }

  @Get(':id/students')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('teaching_groups.read')
  @ApiOperation({
    summary: 'Resolve the students of a teaching group',
    description:
      'Returns the active enrollments of the group\'s academic year/class/stream context.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Students of the teaching group' })
  @ApiNotFoundResponse({
    description: 'Teaching group does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing teaching_groups.read permission',
  })
  students(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.teachingGroupsService.students(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('teaching_groups.update')
  @ApiOperation({
    summary: 'Update or deactivate a teaching group of the active school',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated teaching group' })
  @ApiNotFoundResponse({
    description: 'Teaching group does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing teaching_groups.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeachingGroupDto,
  ) {
    return this.teachingGroupsService.update(user.activeSchoolId, id, dto);
  }
}
