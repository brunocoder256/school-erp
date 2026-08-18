import {
  Body,
  Controller,
  Delete,
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
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationsService } from '../services/organizations.service';

/**
 * Academic organization model administration for the active school.
 * Organization models (Thematic, Subject-based, Competency-based, ...) are
 * configurable data, not hard-coded enums.
 */
@ApiTags('academic-organizations')
@ApiBearerAuth()
@Controller('academic-organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.create')
  @ApiOperation({
    summary: 'Create an academic organization model for the active school',
  })
  @ApiCreatedResponse({ description: 'Created academic organization' })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.read')
  @ApiOperation({
    summary: 'List academic organization models of the active school',
  })
  @ApiOkResponse({
    description: 'Academic organization models of the active school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.read permission',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.list(user.activeSchoolId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.read')
  @ApiOperation({
    summary: 'Get an academic organization model of the active school',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Academic organization' })
  @ApiNotFoundResponse({
    description: 'Academic organization does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.read permission',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.organizationsService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.update')
  @ApiOperation({
    summary: 'Update an academic organization model of the active school',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated academic organization' })
  @ApiNotFoundResponse({
    description: 'Academic organization does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(user.activeSchoolId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.delete')
  @ApiOperation({
    summary:
      'Delete an academic organization model of the active school that is not used by levels',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Academic organization deleted' })
  @ApiNotFoundResponse({
    description: 'Academic organization does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.delete permission',
  })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.organizationsService.delete(user.activeSchoolId, id);
  }
}
