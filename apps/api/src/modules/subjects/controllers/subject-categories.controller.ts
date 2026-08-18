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
import { CreateSubjectCategoryDto } from '../dto/create-subject-category.dto';
import { UpdateSubjectCategoryDto } from '../dto/update-subject-category.dto';
import { SubjectCategoriesService } from '../services/subject-categories.service';

/**
 * Subject category administration for the authenticated user's active school.
 */
@ApiTags('subject-categories')
@ApiBearerAuth()
@Controller('subject-categories')
export class SubjectCategoriesController {
  constructor(
    private readonly subjectCategoriesService: SubjectCategoriesService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subjects.create')
  @ApiOperation({
    summary: 'Create a subject category for the active school',
  })
  @ApiCreatedResponse({ description: 'Created subject category' })
  @ApiForbiddenResponse({ description: 'Missing subjects.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubjectCategoryDto,
  ) {
    return this.subjectCategoriesService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subjects.read')
  @ApiOperation({ summary: 'List subject categories of the active school' })
  @ApiOkResponse({ description: 'Subject categories of the active school' })
  @ApiForbiddenResponse({ description: 'Missing subjects.read permission' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.subjectCategoriesService.list(user.activeSchoolId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subjects.read')
  @ApiOperation({ summary: 'Get a subject category of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Subject category' })
  @ApiNotFoundResponse({
    description: 'Subject category does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing subjects.read permission' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subjectCategoriesService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subjects.update')
  @ApiOperation({ summary: 'Update a subject category of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated subject category' })
  @ApiNotFoundResponse({
    description: 'Subject category does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing subjects.update permission' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubjectCategoryDto,
  ) {
    return this.subjectCategoriesService.update(user.activeSchoolId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subjects.delete')
  @ApiOperation({
    summary: 'Delete a subject category of the active school that has no subjects',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Subject category deleted' })
  @ApiNotFoundResponse({
    description: 'Subject category does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing subjects.delete permission' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subjectCategoriesService.delete(user.activeSchoolId, id);
  }
}