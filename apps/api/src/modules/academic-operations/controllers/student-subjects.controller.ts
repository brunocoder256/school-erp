import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { Permissions } from '../../identity/decorators/permissions.decorator';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PermissionGuard } from '../../identity/guards/permission.guard';
import type { AuthenticatedUser } from '../../identity/types/authenticated-request';
import { CreateStudentSubjectDto } from '../dto/create-student-subject.dto';
import { ListStudentSubjectsQueryDto } from '../dto/list-student-subjects-query.dto';
import { UpdateStudentSubjectDto } from '../dto/update-student-subject.dto';
import { StudentSubjectsService } from '../services/student-subjects.service';

/**
 * Student subject enrollment administration nested under an academic
 * enrollment of the active school.
 */
@ApiTags('student-subjects')
@ApiBearerAuth()
@Controller('enrollments/:enrollmentId/subjects')
export class StudentSubjectsController {
  constructor(private readonly studentSubjectsService: StudentSubjectsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('student_subjects.create')
  @ApiOperation({ summary: 'Enroll a student in a subject' })
  @ApiParam({ name: 'enrollmentId', type: String })
  @ApiCreatedResponse({ description: 'Created student subject enrollment' })
  @ApiNotFoundResponse({
    description: 'Enrollment does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing student_subjects.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: CreateStudentSubjectDto,
  ) {
    return this.studentSubjectsService.create(
      user.activeSchoolId,
      enrollmentId,
      dto,
    );
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('student_subjects.read')
  @ApiOperation({ summary: 'List the subjects of a student enrollment' })
  @ApiParam({ name: 'enrollmentId', type: String })
  @ApiOkResponse({ description: 'Subject enrollments of the student' })
  @ApiNotFoundResponse({
    description: 'Enrollment does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing student_subjects.read permission',
  })
  listByEnrollment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ) {
    return this.studentSubjectsService.listByEnrollment(
      user.activeSchoolId,
      enrollmentId,
    );
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('student_subjects.update')
  @ApiOperation({
    summary: 'Update or deactivate a student subject enrollment',
  })
  @ApiParam({ name: 'enrollmentId', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated student subject enrollment' })
  @ApiNotFoundResponse({
    description: 'Enrollment or subject enrollment not found',
  })
  @ApiForbiddenResponse({
    description: 'Missing student_subjects.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentSubjectDto,
  ) {
    return this.studentSubjectsService.update(
      user.activeSchoolId,
      enrollmentId,
      id,
      dto,
    );
  }
}

/**
 * Cross-enrollment student subject queries within the active school (e.g.
 * list students taking a subject).
 */
@ApiTags('student-subjects')
@ApiBearerAuth()
@Controller('subject-enrollments')
export class SubjectEnrollmentsController {
  constructor(private readonly studentSubjectsService: StudentSubjectsService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('student_subjects.read')
  @ApiOperation({
    summary: 'List student subject enrollments of the active school',
    description:
      'Filters by enrollment, subject, academic year, class or stream. Results are always scoped to the active school.',
  })
  @ApiQuery({ name: 'enrollmentId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'academicClassId', required: false, type: String })
  @ApiQuery({ name: 'streamId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiOkResponse({
    description: 'Student subject enrollments of the active school',
  })
  @ApiForbiddenResponse({
    description: 'Missing student_subjects.read permission',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListStudentSubjectsQueryDto,
  ) {
    return this.studentSubjectsService.list(user.activeSchoolId, query);
  }
}
