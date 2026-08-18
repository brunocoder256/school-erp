import {
  Body,
  Controller,
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
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { StudentsService } from '../services/students.service';

/**
 * Student administration for the authenticated user's active school.
 *
 * The tenant context is resolved exclusively from the JWT → AuthGuard →
 * activeSchoolId. School IDs supplied by the client are never honored.
 */
@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('students.create')
  @ApiOperation({ summary: 'Create a student in the active school' })
  @ApiCreatedResponse({ description: 'Created student' })
  @ApiForbiddenResponse({ description: 'Missing students.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStudentDto,
  ) {
    return this.studentsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('students.read')
  @ApiOperation({ summary: 'List students of the active school' })
  @ApiOkResponse({ description: 'Students of the active school' })
  @ApiForbiddenResponse({ description: 'Missing students.read permission' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.studentsService.list(user.activeSchoolId);
  }

  @Get(':studentId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('students.read')
  @ApiOperation({ summary: 'Get a student of the active school' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiOkResponse({ description: 'Student' })
  @ApiNotFoundResponse({
    description: 'Student does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing students.read permission' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.studentsService.get(user.activeSchoolId, studentId);
  }

  @Patch(':studentId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('students.update')
  @ApiOperation({ summary: 'Update a student of the active school' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiOkResponse({ description: 'Updated student' })
  @ApiNotFoundResponse({
    description: 'Student does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing students.update permission' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(user.activeSchoolId, studentId, dto);
  }
}
