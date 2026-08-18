import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { SetEnrollmentCombinationDto } from '../dto/set-enrollment-combination.dto';
import { EnrollmentCombinationsService } from '../services/enrollment-combinations.service';

/**
 * Subject combination assignment for a student's academic enrollment of the
 * active school. Combines the existing subject combination catalog with the
 * student's academic enrollment and bulk-enrolls the combination's subjects.
 */
@ApiTags('enrollment-combinations')
@ApiBearerAuth()
@Controller('enrollments/:enrollmentId/combination')
export class EnrollmentCombinationsController {
  constructor(
    private readonly enrollmentCombinationsService: EnrollmentCombinationsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('student_subjects.create')
  @ApiOperation({
    summary: 'Assign a subject combination to an enrollment and enroll its subjects',
  })
  @ApiParam({ name: 'enrollmentId', type: String })
  @ApiCreatedResponse({
    description: 'Assigned combination with the enrolled subjects',
  })
  @ApiNotFoundResponse({
    description: 'Enrollment or combination does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing student_subjects.create permission',
  })
  setCombination(
    @CurrentUser() user: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: SetEnrollmentCombinationDto,
  ) {
    return this.enrollmentCombinationsService.setCombination(
      user.activeSchoolId,
      enrollmentId,
      dto,
    );
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('student_subjects.read')
  @ApiOperation({ summary: 'Get the subject combination of an enrollment' })
  @ApiParam({ name: 'enrollmentId', type: String })
  @ApiOkResponse({
    description: 'Combination assigned to the enrollment (or nulls)',
  })
  @ApiNotFoundResponse({
    description: 'Enrollment does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing student_subjects.read permission',
  })
  getCombination(
    @CurrentUser() user: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ) {
    return this.enrollmentCombinationsService.getCombination(
      user.activeSchoolId,
      enrollmentId,
    );
  }
}
