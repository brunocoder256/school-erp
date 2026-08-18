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
import { CreateResponsibilityDto } from '../dto/create-responsibility.dto';
import { UpdateResponsibilityDto } from '../dto/update-responsibility.dto';
import { ResponsibilitiesService } from '../services/responsibilities.service';

/**
 * Staff responsibility administration nested under a staff member of the
 * active school. Responsibilities are academic-year scoped roles such as
 * class teacher or head of department, with a school-defined type label.
 * There is no hard delete — responsibilities are deactivated via isActive.
 */
@ApiTags('responsibilities')
@ApiBearerAuth()
@Controller('staff/:staffId/responsibilities')
export class ResponsibilitiesController {
  constructor(
    private readonly responsibilitiesService: ResponsibilitiesService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.create')
  @ApiOperation({ summary: 'Assign a responsibility to a staff member' })
  @ApiParam({ name: 'staffId', type: String })
  @ApiCreatedResponse({ description: 'Created responsibility' })
  @ApiNotFoundResponse({
    description: 'Staff member does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: CreateResponsibilityDto,
  ) {
    return this.responsibilitiesService.create(
      user.activeSchoolId,
      staffId,
      dto,
    );
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.read')
  @ApiOperation({ summary: 'List responsibilities of a staff member' })
  @ApiParam({ name: 'staffId', type: String })
  @ApiOkResponse({ description: 'Responsibilities of the staff member' })
  @ApiNotFoundResponse({
    description: 'Staff member does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.read permission' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ) {
    return this.responsibilitiesService.list(user.activeSchoolId, staffId);
  }

  @Patch(':responsibilityId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.update')
  @ApiOperation({ summary: 'Update a responsibility of a staff member' })
  @ApiParam({ name: 'staffId', type: String })
  @ApiParam({ name: 'responsibilityId', type: String })
  @ApiOkResponse({ description: 'Updated responsibility' })
  @ApiNotFoundResponse({
    description: 'Staff member or responsibility does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.update permission' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Param('responsibilityId', ParseUUIDPipe) responsibilityId: string,
    @Body() dto: UpdateResponsibilityDto,
  ) {
    return this.responsibilitiesService.update(
      user.activeSchoolId,
      staffId,
      responsibilityId,
      dto,
    );
  }
}