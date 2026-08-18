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
import { CreateStaffPositionDto } from '../dto/create-staff-position.dto';
import { UpdateStaffPositionDto } from '../dto/update-staff-position.dto';
import { StaffPositionsService } from '../services/staff-positions.service';

/**
 * Staff position/designation administration for the authenticated user's
 * active school. Positions are configurable (never a hard-coded enum).
 */
@ApiTags('staff-positions')
@ApiBearerAuth()
@Controller('staff-positions')
export class StaffPositionsController {
  constructor(private readonly staffPositionsService: StaffPositionsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.create')
  @ApiOperation({ summary: 'Create a staff position in the active school' })
  @ApiCreatedResponse({ description: 'Created staff position' })
  @ApiForbiddenResponse({ description: 'Missing staff.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStaffPositionDto,
  ) {
    return this.staffPositionsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.read')
  @ApiOperation({ summary: 'List staff positions of the active school' })
  @ApiOkResponse({ description: 'Staff positions of the active school' })
  @ApiForbiddenResponse({ description: 'Missing staff.read permission' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.staffPositionsService.list(user.activeSchoolId);
  }

  @Get(':positionId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.read')
  @ApiOperation({ summary: 'Get a staff position of the active school' })
  @ApiParam({ name: 'positionId', type: String })
  @ApiOkResponse({ description: 'Staff position' })
  @ApiNotFoundResponse({
    description: 'Staff position does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.read permission' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('positionId', ParseUUIDPipe) positionId: string,
  ) {
    return this.staffPositionsService.get(user.activeSchoolId, positionId);
  }

  @Patch(':positionId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.update')
  @ApiOperation({ summary: 'Update a staff position of the active school' })
  @ApiParam({ name: 'positionId', type: String })
  @ApiOkResponse({ description: 'Updated staff position' })
  @ApiNotFoundResponse({
    description: 'Staff position does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.update permission' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('positionId', ParseUUIDPipe) positionId: string,
    @Body() dto: UpdateStaffPositionDto,
  ) {
    return this.staffPositionsService.update(user.activeSchoolId, positionId, dto);
  }

  @Delete(':positionId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.delete')
  @ApiOperation({
    summary: 'Delete a staff position that is not held by any staff member',
  })
  @ApiParam({ name: 'positionId', type: String })
  @ApiOkResponse({ description: 'Staff position deleted' })
  @ApiNotFoundResponse({
    description: 'Staff position does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.delete permission' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('positionId', ParseUUIDPipe) positionId: string,
  ) {
    return this.staffPositionsService.delete(user.activeSchoolId, positionId);
  }
}