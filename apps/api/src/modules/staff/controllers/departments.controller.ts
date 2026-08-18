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
import { CreateDepartmentDto } from '../dto/create-department.dto';
import { UpdateDepartmentDto } from '../dto/update-department.dto';
import { DepartmentsService } from '../services/departments.service';

/**
 * Department administration for the authenticated user's active school.
 * Departments are optional configurable structure.
 */
@ApiTags('departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.create')
  @ApiOperation({ summary: 'Create a department in the active school' })
  @ApiCreatedResponse({ description: 'Created department' })
  @ApiForbiddenResponse({ description: 'Missing staff.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.read')
  @ApiOperation({ summary: 'List departments of the active school' })
  @ApiOkResponse({ description: 'Departments of the active school' })
  @ApiForbiddenResponse({ description: 'Missing staff.read permission' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.departmentsService.list(user.activeSchoolId);
  }

  @Get(':departmentId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.read')
  @ApiOperation({ summary: 'Get a department of the active school' })
  @ApiParam({ name: 'departmentId', type: String })
  @ApiOkResponse({ description: 'Department' })
  @ApiNotFoundResponse({
    description: 'Department does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.read permission' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ) {
    return this.departmentsService.get(user.activeSchoolId, departmentId);
  }

  @Patch(':departmentId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.update')
  @ApiOperation({ summary: 'Update a department of the active school' })
  @ApiParam({ name: 'departmentId', type: String })
  @ApiOkResponse({ description: 'Updated department' })
  @ApiNotFoundResponse({
    description: 'Department does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.update permission' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(user.activeSchoolId, departmentId, dto);
  }

  @Delete(':departmentId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.delete')
  @ApiOperation({
    summary: 'Delete a department that has no staff members or responsibilities',
  })
  @ApiParam({ name: 'departmentId', type: String })
  @ApiOkResponse({ description: 'Department deleted' })
  @ApiNotFoundResponse({
    description: 'Department does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.delete permission' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('departmentId', ParseUUIDPipe) departmentId: string,
  ) {
    return this.departmentsService.delete(user.activeSchoolId, departmentId);
  }
}