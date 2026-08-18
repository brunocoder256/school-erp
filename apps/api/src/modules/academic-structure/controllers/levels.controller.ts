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
import { CreateLevelDto } from '../dto/create-level.dto';
import { UpdateLevelDto } from '../dto/update-level.dto';
import { LevelsService } from '../services/levels.service';

/**
 * Academic level administration nested under a section of the active school.
 * Levels (N1-N3, P1-P7, S1-S6, ...) are configurable data, not enums.
 */
@ApiTags('levels')
@ApiBearerAuth()
@Controller('sections/:sectionId/levels')
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.create')
  @ApiOperation({ summary: 'Create an academic level in a section' })
  @ApiParam({ name: 'sectionId', type: String })
  @ApiCreatedResponse({ description: 'Created academic level' })
  @ApiNotFoundResponse({
    description: 'Section does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateLevelDto,
  ) {
    return this.levelsService.create(user.activeSchoolId, sectionId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.read')
  @ApiOperation({ summary: 'List academic levels of a section' })
  @ApiParam({ name: 'sectionId', type: String })
  @ApiOkResponse({ description: 'Academic levels of the section' })
  @ApiNotFoundResponse({
    description: 'Section does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.read permission',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ) {
    return this.levelsService.list(user.activeSchoolId, sectionId);
  }

  @Get(':levelId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.read')
  @ApiOperation({ summary: 'Get an academic level of a section' })
  @ApiParam({ name: 'sectionId', type: String })
  @ApiParam({ name: 'levelId', type: String })
  @ApiOkResponse({ description: 'Academic level' })
  @ApiNotFoundResponse({
    description: 'Section or level does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.read permission',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('levelId', ParseUUIDPipe) levelId: string,
  ) {
    return this.levelsService.get(user.activeSchoolId, sectionId, levelId);
  }

  @Patch(':levelId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.update')
  @ApiOperation({ summary: 'Update an academic level of a section' })
  @ApiParam({ name: 'sectionId', type: String })
  @ApiParam({ name: 'levelId', type: String })
  @ApiOkResponse({ description: 'Updated academic level' })
  @ApiNotFoundResponse({
    description: 'Section or level does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('levelId', ParseUUIDPipe) levelId: string,
    @Body() dto: UpdateLevelDto,
  ) {
    return this.levelsService.update(user.activeSchoolId, sectionId, levelId, dto);
  }

  @Delete(':levelId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.delete')
  @ApiOperation({
    summary: 'Delete an academic level that has no classes or progression rules',
  })
  @ApiParam({ name: 'sectionId', type: String })
  @ApiParam({ name: 'levelId', type: String })
  @ApiOkResponse({ description: 'Academic level deleted' })
  @ApiNotFoundResponse({
    description: 'Section or level does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.delete permission',
  })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('levelId', ParseUUIDPipe) levelId: string,
  ) {
    return this.levelsService.delete(user.activeSchoolId, sectionId, levelId);
  }
}
