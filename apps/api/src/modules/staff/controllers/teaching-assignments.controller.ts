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
import { CreateTeachingAssignmentDto } from '../dto/create-teaching-assignment.dto';
import { UpdateTeachingAssignmentDto } from '../dto/update-teaching-assignment.dto';
import { TeachingAssignmentsService } from '../services/teaching-assignments.service';

/**
 * Teaching assignment administration for the authenticated user's active
 * school. Assignments connect staff (teacher) + academic year + subject +
 * academic class + optional stream. There is no hard delete — deactivate via
 * isActive so historical assignments survive.
 */
@ApiTags('teaching-assignments')
@ApiBearerAuth()
@Controller('teaching-assignments')
export class TeachingAssignmentsController {
  constructor(
    private readonly teachingAssignmentsService: TeachingAssignmentsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('teacher_assignments.create')
  @ApiOperation({ summary: 'Create a teaching assignment in the active school' })
  @ApiCreatedResponse({ description: 'Created teaching assignment' })
  @ApiNotFoundResponse({
    description: 'Staff member, year, subject or class not found',
  })
  @ApiForbiddenResponse({
    description: 'Missing teacher_assignments.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTeachingAssignmentDto,
  ) {
    return this.teachingAssignmentsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('teacher_assignments.read')
  @ApiOperation({ summary: 'List teaching assignments of the active school' })
  @ApiOkResponse({ description: 'Teaching assignments of the active school' })
  @ApiForbiddenResponse({
    description: 'Missing teacher_assignments.read permission',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.teachingAssignmentsService.list(user.activeSchoolId);
  }

  @Get(':assignmentId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('teacher_assignments.read')
  @ApiOperation({ summary: 'Get a teaching assignment of the active school' })
  @ApiParam({ name: 'assignmentId', type: String })
  @ApiOkResponse({ description: 'Teaching assignment' })
  @ApiNotFoundResponse({
    description: 'Teaching assignment does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing teacher_assignments.read permission',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.teachingAssignmentsService.get(user.activeSchoolId, assignmentId);
  }

  @Patch(':assignmentId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('teacher_assignments.update')
  @ApiOperation({ summary: 'Update a teaching assignment of the active school' })
  @ApiParam({ name: 'assignmentId', type: String })
  @ApiOkResponse({ description: 'Updated teaching assignment' })
  @ApiNotFoundResponse({
    description: 'Teaching assignment does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing teacher_assignments.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: UpdateTeachingAssignmentDto,
  ) {
    return this.teachingAssignmentsService.update(
      user.activeSchoolId,
      assignmentId,
      dto,
    );
  }
}