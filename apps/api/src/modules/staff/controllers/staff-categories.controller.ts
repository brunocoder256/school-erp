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
import { CreateStaffCategoryDto } from '../dto/create-staff-category.dto';
import { UpdateStaffCategoryDto } from '../dto/update-staff-category.dto';
import { StaffCategoriesService } from '../services/staff-categories.service';

/**
 * Staff category administration for the authenticated user's active school.
 * Categories are configurable staff classifications.
 */
@ApiTags('staff-categories')
@ApiBearerAuth()
@Controller('staff-categories')
export class StaffCategoriesController {
  constructor(private readonly staffCategoriesService: StaffCategoriesService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.create')
  @ApiOperation({ summary: 'Create a staff category in the active school' })
  @ApiCreatedResponse({ description: 'Created staff category' })
  @ApiForbiddenResponse({ description: 'Missing staff.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStaffCategoryDto,
  ) {
    return this.staffCategoriesService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.read')
  @ApiOperation({ summary: 'List staff categories of the active school' })
  @ApiOkResponse({ description: 'Staff categories of the active school' })
  @ApiForbiddenResponse({ description: 'Missing staff.read permission' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.staffCategoriesService.list(user.activeSchoolId);
  }

  @Get(':staffCategoryId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.read')
  @ApiOperation({ summary: 'Get a staff category of the active school' })
  @ApiParam({ name: 'staffCategoryId', type: String })
  @ApiOkResponse({ description: 'Staff category' })
  @ApiNotFoundResponse({
    description: 'Staff category does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.read permission' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffCategoryId', ParseUUIDPipe) staffCategoryId: string,
  ) {
    return this.staffCategoriesService.get(user.activeSchoolId, staffCategoryId);
  }

  @Patch(':staffCategoryId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.update')
  @ApiOperation({ summary: 'Update a staff category of the active school' })
  @ApiParam({ name: 'staffCategoryId', type: String })
  @ApiOkResponse({ description: 'Updated staff category' })
  @ApiNotFoundResponse({
    description: 'Staff category does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.update permission' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffCategoryId', ParseUUIDPipe) staffCategoryId: string,
    @Body() dto: UpdateStaffCategoryDto,
  ) {
    return this.staffCategoriesService.update(
      user.activeSchoolId,
      staffCategoryId,
      dto,
    );
  }

  @Delete(':staffCategoryId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.delete')
  @ApiOperation({
    summary: 'Delete a staff category that has no staff members',
  })
  @ApiParam({ name: 'staffCategoryId', type: String })
  @ApiOkResponse({ description: 'Staff category deleted' })
  @ApiNotFoundResponse({
    description: 'Staff category does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.delete permission' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffCategoryId', ParseUUIDPipe) staffCategoryId: string,
  ) {
    return this.staffCategoriesService.delete(user.activeSchoolId, staffCategoryId);
  }
}