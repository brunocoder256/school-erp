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
import { CreateAcademicYearDto } from '../dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from '../dto/update-academic-year.dto';
import { AcademicYearsService } from '../services/academic-years.service';

/**
 * Academic year administration for the authenticated user's active school.
 *
 * The tenant context is resolved exclusively from the JWT → AuthGuard →
 * activeSchoolId. School IDs supplied by the client are never honored.
 */
@ApiTags('academic-years')
@ApiBearerAuth()
@Controller('academic-years')
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_years.create')
  @ApiOperation({ summary: 'Create an academic year for the active school' })
  @ApiCreatedResponse({ description: 'Created academic year' })
  @ApiForbiddenResponse({
    description: 'Missing academic_years.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAcademicYearDto,
  ) {
    return this.academicYearsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_years.read')
  @ApiOperation({ summary: 'List academic years of the active school' })
  @ApiOkResponse({ description: 'Academic years of the active school' })
  @ApiForbiddenResponse({
    description: 'Missing academic_years.read permission',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.academicYearsService.list(user.activeSchoolId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_years.read')
  @ApiOperation({ summary: 'Get an academic year of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Academic year' })
  @ApiNotFoundResponse({
    description: 'Academic year does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_years.read permission',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.academicYearsService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_years.update')
  @ApiOperation({ summary: 'Update an academic year of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated academic year' })
  @ApiNotFoundResponse({
    description: 'Academic year does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_years.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.academicYearsService.update(user.activeSchoolId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_years.delete')
  @ApiOperation({
    summary: 'Delete an academic year of the active school that has no terms',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Academic year deleted' })
  @ApiNotFoundResponse({
    description: 'Academic year does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_years.delete permission',
  })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.academicYearsService.delete(user.activeSchoolId, id);
  }
}
