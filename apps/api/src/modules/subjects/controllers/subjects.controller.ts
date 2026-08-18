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
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import { SubjectsService } from '../services/subjects.service';

/**
 * Subject / learning-area administration for the authenticated user's active
 * school. The subject catalog is configurable data.
 */
@ApiTags('subjects')
@ApiBearerAuth()
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subjects.create')
  @ApiOperation({ summary: 'Create a subject for the active school' })
  @ApiCreatedResponse({ description: 'Created subject' })
  @ApiForbiddenResponse({ description: 'Missing subjects.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubjectDto,
  ) {
    return this.subjectsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subjects.read')
  @ApiOperation({ summary: 'List subjects of the active school' })
  @ApiOkResponse({ description: 'Subjects of the active school' })
  @ApiForbiddenResponse({ description: 'Missing subjects.read permission' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.subjectsService.list(user.activeSchoolId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subjects.read')
  @ApiOperation({ summary: 'Get a subject of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Subject' })
  @ApiNotFoundResponse({
    description: 'Subject does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing subjects.read permission' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subjectsService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subjects.update')
  @ApiOperation({ summary: 'Update a subject of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated subject' })
  @ApiNotFoundResponse({
    description: 'Subject does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing subjects.update permission' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.subjectsService.update(user.activeSchoolId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subjects.delete')
  @ApiOperation({
    summary: 'Delete a subject of the active school that is not offered or used',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Subject deleted' })
  @ApiNotFoundResponse({
    description: 'Subject does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing subjects.delete permission' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subjectsService.delete(user.activeSchoolId, id);
  }
}