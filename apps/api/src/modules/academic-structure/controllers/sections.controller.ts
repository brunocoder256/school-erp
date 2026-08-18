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
import { CreateSectionDto } from '../dto/create-section.dto';
import { UpdateSectionDto } from '../dto/update-section.dto';
import { SectionsService } from '../services/sections.service';

/**
 * Education section administration for the authenticated user's active school.
 * The tenant context is resolved exclusively from the JWT -> activeSchoolId.
 */
@ApiTags('sections')
@ApiBearerAuth()
@Controller('sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.create')
  @ApiOperation({ summary: 'Create an education section for the active school' })
  @ApiCreatedResponse({ description: 'Created education section' })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSectionDto,
  ) {
    return this.sectionsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.read')
  @ApiOperation({ summary: 'List education sections of the active school' })
  @ApiOkResponse({ description: 'Education sections of the active school' })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.read permission',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.sectionsService.list(user.activeSchoolId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.read')
  @ApiOperation({ summary: 'Get an education section of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Education section' })
  @ApiNotFoundResponse({
    description: 'Section does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.read permission',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sectionsService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.update')
  @ApiOperation({ summary: 'Update an education section of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated education section' })
  @ApiNotFoundResponse({
    description: 'Section does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(user.activeSchoolId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.delete')
  @ApiOperation({
    summary: 'Delete an education section of the active school that has no levels',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Education section deleted' })
  @ApiNotFoundResponse({
    description: 'Section does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.delete permission',
  })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sectionsService.delete(user.activeSchoolId, id);
  }
}
