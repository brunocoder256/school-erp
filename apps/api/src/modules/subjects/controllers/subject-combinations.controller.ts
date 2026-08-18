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
import { CreateSubjectCombinationDto } from '../dto/create-subject-combination.dto';
import { UpdateSubjectCombinationDto } from '../dto/update-subject-combination.dto';
import { SubjectCombinationsService } from '../services/subject-combinations.service';

/**
 * Subject combination / pathway administration for the active school.
 * Combinations (PCM, PCB, ...) are configurable data.
 */
@ApiTags('subject-combinations')
@ApiBearerAuth()
@Controller('subject-combinations')
export class SubjectCombinationsController {
  constructor(
    private readonly subjectCombinationsService: SubjectCombinationsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('combinations.create')
  @ApiOperation({
    summary: 'Create a subject combination for the active school',
  })
  @ApiCreatedResponse({ description: 'Created subject combination' })
  @ApiForbiddenResponse({
    description: 'Missing combinations.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubjectCombinationDto,
  ) {
    return this.subjectCombinationsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('combinations.read')
  @ApiOperation({ summary: 'List subject combinations of the active school' })
  @ApiOkResponse({ description: 'Subject combinations of the active school' })
  @ApiForbiddenResponse({
    description: 'Missing combinations.read permission',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.subjectCombinationsService.list(user.activeSchoolId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('combinations.read')
  @ApiOperation({ summary: 'Get a subject combination of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Subject combination' })
  @ApiNotFoundResponse({
    description: 'Subject combination does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing combinations.read permission',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subjectCombinationsService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('combinations.update')
  @ApiOperation({ summary: 'Update a subject combination of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated subject combination' })
  @ApiNotFoundResponse({
    description: 'Subject combination does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing combinations.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubjectCombinationDto,
  ) {
    return this.subjectCombinationsService.update(user.activeSchoolId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('combinations.delete')
  @ApiOperation({ summary: 'Delete a subject combination of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Subject combination deleted' })
  @ApiNotFoundResponse({
    description: 'Subject combination does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing combinations.delete permission',
  })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subjectCombinationsService.delete(user.activeSchoolId, id);
  }
}