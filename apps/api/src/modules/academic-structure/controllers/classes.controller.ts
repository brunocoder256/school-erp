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
import { CreateClassDto } from '../dto/create-class.dto';
import { UpdateClassDto } from '../dto/update-class.dto';
import { ClassesService } from '../services/classes.service';

/**
 * Academic class administration nested under a level of the active school.
 * Reuses the existing AcademicClass model (no duplicate).
 */
@ApiTags('classes')
@ApiBearerAuth()
@Controller('levels/:levelId/classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.create')
  @ApiOperation({ summary: 'Create an academic class in a level' })
  @ApiParam({ name: 'levelId', type: String })
  @ApiCreatedResponse({ description: 'Created academic class' })
  @ApiNotFoundResponse({
    description: 'Level does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('levelId', ParseUUIDPipe) levelId: string,
    @Body() dto: CreateClassDto,
  ) {
    return this.classesService.create(user.activeSchoolId, levelId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.read')
  @ApiOperation({ summary: 'List academic classes of a level' })
  @ApiParam({ name: 'levelId', type: String })
  @ApiOkResponse({ description: 'Academic classes of the level' })
  @ApiNotFoundResponse({
    description: 'Level does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.read permission',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('levelId', ParseUUIDPipe) levelId: string,
  ) {
    return this.classesService.list(user.activeSchoolId, levelId);
  }

  @Get(':classId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.read')
  @ApiOperation({ summary: 'Get an academic class of a level' })
  @ApiParam({ name: 'levelId', type: String })
  @ApiParam({ name: 'classId', type: String })
  @ApiOkResponse({ description: 'Academic class' })
  @ApiNotFoundResponse({
    description: 'Level or class does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.read permission',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('levelId', ParseUUIDPipe) levelId: string,
    @Param('classId', ParseUUIDPipe) classId: string,
  ) {
    return this.classesService.get(user.activeSchoolId, levelId, classId);
  }

  @Patch(':classId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.update')
  @ApiOperation({ summary: 'Update an academic class of a level' })
  @ApiParam({ name: 'levelId', type: String })
  @ApiParam({ name: 'classId', type: String })
  @ApiOkResponse({ description: 'Updated academic class' })
  @ApiNotFoundResponse({
    description: 'Level or class does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('levelId', ParseUUIDPipe) levelId: string,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classesService.update(user.activeSchoolId, levelId, classId, dto);
  }

  @Delete(':classId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.delete')
  @ApiOperation({
    summary: 'Delete an academic class that has no streams or enrollments',
  })
  @ApiParam({ name: 'levelId', type: String })
  @ApiParam({ name: 'classId', type: String })
  @ApiOkResponse({ description: 'Academic class deleted' })
  @ApiNotFoundResponse({
    description: 'Level or class does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.delete permission',
  })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('levelId', ParseUUIDPipe) levelId: string,
    @Param('classId', ParseUUIDPipe) classId: string,
  ) {
    return this.classesService.delete(user.activeSchoolId, levelId, classId);
  }
}
