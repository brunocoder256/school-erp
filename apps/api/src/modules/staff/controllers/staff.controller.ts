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
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { Permissions } from '../../identity/decorators/permissions.decorator';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PermissionGuard } from '../../identity/guards/permission.guard';
import type { AuthenticatedUser } from '../../identity/types/authenticated-request';
import { CreateStaffDto } from '../dto/create-staff.dto';
import { ListStaffQueryDto } from '../dto/list-staff-query.dto';
import { UpdateStaffDto } from '../dto/update-staff.dto';
import { StaffService } from '../services/staff.service';

/**
 * Staff administration for the authenticated user's active school.
 *
 * The tenant context is resolved exclusively from the JWT → AuthGuard →
 * activeSchoolId. School IDs supplied by the client are never honored. There
 * is intentionally no DELETE endpoint — the staff lifecycle is driven through
 * employmentStatus so historical records survive.
 */
@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.create')
  @ApiOperation({ summary: 'Create a staff member in the active school' })
  @ApiCreatedResponse({ description: 'Created staff member' })
  @ApiForbiddenResponse({ description: 'Missing staff.create permission' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStaffDto) {
    return this.staffService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.read')
  @ApiOperation({ summary: 'List staff of the active school' })
  @ApiOkResponse({ description: 'Staff summaries of the active school' })
  @ApiForbiddenResponse({ description: 'Missing staff.read permission' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListStaffQueryDto,
  ) {
    return this.staffService.list(user.activeSchoolId, query);
  }

  @Get(':staffId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.read')
  @ApiOperation({ summary: 'Get a staff member of the active school' })
  @ApiParam({ name: 'staffId', type: String })
  @ApiOkResponse({ description: 'Staff detail' })
  @ApiNotFoundResponse({
    description: 'Staff member does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.read permission' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ) {
    return this.staffService.get(user.activeSchoolId, staffId);
  }

  @Patch(':staffId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.update')
  @ApiOperation({ summary: 'Update a staff member of the active school' })
  @ApiParam({ name: 'staffId', type: String })
  @ApiOkResponse({ description: 'Updated staff member' })
  @ApiNotFoundResponse({
    description: 'Staff member does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.update permission' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.update(user.activeSchoolId, staffId, dto);
  }
}