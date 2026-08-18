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
import { CreateEnrollmentDto } from '../dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from '../dto/update-enrollment.dto';
import { EnrollmentsService } from '../services/enrollments.service';

/**
 * Enrollment administration nested under a student of the active school.
 *
 * The tenant relationship enrollment → student → activeSchoolId is verified
 * by the service on every operation. Client-supplied school IDs are never
 * honored.
 */
@ApiTags('enrollments')
@ApiBearerAuth()
@Controller('students/:studentId/enrollments')
export class StudentEnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('students.create')
  @ApiOperation({ summary: 'Enroll a student for an academic year' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiCreatedResponse({ description: 'Created enrollment' })
  @ApiNotFoundResponse({
    description: 'Student does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing students.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: CreateEnrollmentDto,
  ) {
    return this.enrollmentsService.create(user.activeSchoolId, studentId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('students.read')
  @ApiOperation({ summary: 'List enrollments of a student' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiOkResponse({ description: 'Enrollments of the student' })
  @ApiNotFoundResponse({
    description: 'Student does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing students.read permission' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.enrollmentsService.list(user.activeSchoolId, studentId);
  }
}

/**
 * Enrollment administration by enrollment id within the active school.
 */
@ApiTags('enrollments')
@ApiBearerAuth()
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get(':enrollmentId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('students.read')
  @ApiOperation({ summary: 'Get an enrollment of the active school' })
  @ApiParam({ name: 'enrollmentId', type: String })
  @ApiOkResponse({ description: 'Enrollment' })
  @ApiNotFoundResponse({
    description: 'Enrollment does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing students.read permission' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ) {
    return this.enrollmentsService.get(user.activeSchoolId, enrollmentId);
  }

  @Patch(':enrollmentId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('students.update')
  @ApiOperation({ summary: 'Update an enrollment of the active school' })
  @ApiParam({ name: 'enrollmentId', type: String })
  @ApiOkResponse({ description: 'Updated enrollment' })
  @ApiNotFoundResponse({
    description: 'Enrollment does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing students.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: UpdateEnrollmentDto,
  ) {
    return this.enrollmentsService.update(
      user.activeSchoolId,
      enrollmentId,
      dto,
    );
  }
}
