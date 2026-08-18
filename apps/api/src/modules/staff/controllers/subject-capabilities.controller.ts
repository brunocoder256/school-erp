import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CreateSubjectCapabilityDto } from '../dto/create-subject-capability.dto';
import { SubjectCapabilitiesService } from '../services/subject-capabilities.service';

/**
 * Teacher subject capability administration nested under a staff member of the
 * active school. A capability is the declared ability to teach a subject — a
 * prerequisite for, but distinct from, an actual teaching assignment.
 */
@ApiTags('subject-capabilities')
@ApiBearerAuth()
@Controller('staff/:staffId/subject-capabilities')
export class SubjectCapabilitiesController {
  constructor(
    private readonly subjectCapabilitiesService: SubjectCapabilitiesService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.create')
  @ApiOperation({ summary: 'Declare a subject capability for a staff member' })
  @ApiParam({ name: 'staffId', type: String })
  @ApiCreatedResponse({ description: 'Created subject capability' })
  @ApiNotFoundResponse({
    description: 'Staff member does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: CreateSubjectCapabilityDto,
  ) {
    return this.subjectCapabilitiesService.create(
      user.activeSchoolId,
      staffId,
      dto,
    );
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.read')
  @ApiOperation({ summary: 'List subject capabilities of a staff member' })
  @ApiParam({ name: 'staffId', type: String })
  @ApiOkResponse({ description: 'Subject capabilities of the staff member' })
  @ApiNotFoundResponse({
    description: 'Staff member does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.read permission' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ) {
    return this.subjectCapabilitiesService.list(user.activeSchoolId, staffId);
  }

  @Delete(':capabilityId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.delete')
  @ApiOperation({ summary: 'Remove a subject capability from a staff member' })
  @ApiParam({ name: 'staffId', type: String })
  @ApiParam({ name: 'capabilityId', type: String })
  @ApiOkResponse({ description: 'Subject capability removed' })
  @ApiNotFoundResponse({
    description: 'Staff member or capability does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.delete permission' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Param('capabilityId', ParseUUIDPipe) capabilityId: string,
  ) {
    return this.subjectCapabilitiesService.delete(
      user.activeSchoolId,
      staffId,
      capabilityId,
    );
  }
}