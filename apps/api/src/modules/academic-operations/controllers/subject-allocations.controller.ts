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
import { CreateSubjectAllocationDto } from '../dto/create-subject-allocation.dto';
import { ListSubjectAllocationsQueryDto } from '../dto/list-subject-allocations-query.dto';
import { UpdateSubjectAllocationDto } from '../dto/update-subject-allocation.dto';
import { SubjectAllocationsService } from '../services/subject-allocations.service';

/**
 * Subject allocation administration for the authenticated user's active
 * school. Allocations connect subject offerings to actual classes/streams.
 * Deactivation is the lifecycle convention; allocations are never
 * hard-deleted so history survives.
 */
@ApiTags('subject-allocations')
@ApiBearerAuth()
@Controller('subject-allocations')
export class SubjectAllocationsController {
  constructor(
    private readonly subjectAllocationsService: SubjectAllocationsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subject_allocations.create')
  @ApiOperation({
    summary: 'Allocate a subject offering to a class/stream for a year',
  })
  @ApiCreatedResponse({ description: 'Created subject allocation' })
  @ApiForbiddenResponse({
    description: 'Missing subject_allocations.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubjectAllocationDto,
  ) {
    return this.subjectAllocationsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subject_allocations.read')
  @ApiOperation({
    summary: 'List subject allocations of the active school',
    description:
      'Optional filters by academic year, class, stream, offering or subject.',
  })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicClassId', required: false, type: String })
  @ApiQuery({ name: 'streamId', required: false, type: String })
  @ApiQuery({ name: 'subjectOfferingId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiOkResponse({ description: 'Subject allocations of the active school' })
  @ApiForbiddenResponse({
    description: 'Missing subject_allocations.read permission',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSubjectAllocationsQueryDto,
  ) {
    return this.subjectAllocationsService.list(user.activeSchoolId, query);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subject_allocations.read')
  @ApiOperation({
    summary: 'Get a subject allocation of the active school',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Subject allocation' })
  @ApiNotFoundResponse({
    description: 'Subject allocation does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing subject_allocations.read permission',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subjectAllocationsService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subject_allocations.update')
  @ApiOperation({
    summary: 'Update or deactivate a subject allocation of the active school',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated subject allocation' })
  @ApiNotFoundResponse({
    description: 'Subject allocation does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing subject_allocations.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubjectAllocationDto,
  ) {
    return this.subjectAllocationsService.update(user.activeSchoolId, id, dto);
  }
}
