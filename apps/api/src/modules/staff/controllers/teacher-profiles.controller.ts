import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { UpsertTeacherProfileDto } from '../dto/upsert-teacher-profile.dto';
import { TeacherProfilesService } from '../services/teacher-profiles.service';

/**
 * Teacher profile administration nested under a staff member of the active
 * school. A teacher is a specialization of staff; the profile holds only
 * optional teacher-specific information and is created on first write.
 */
@ApiTags('teacher-profiles')
@ApiBearerAuth()
@Controller('staff/:staffId/teacher-profile')
export class TeacherProfilesController {
  constructor(private readonly teacherProfilesService: TeacherProfilesService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.read')
  @ApiOperation({ summary: 'Get the teacher profile of a staff member' })
  @ApiParam({ name: 'staffId', type: String })
  @ApiOkResponse({ description: 'Teacher profile' })
  @ApiNotFoundResponse({
    description: 'Staff member or profile does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.read permission' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ) {
    return this.teacherProfilesService.get(user.activeSchoolId, staffId);
  }

  @Put()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.update')
  @ApiOperation({
    summary: 'Create or update the teacher profile of a staff member',
  })
  @ApiParam({ name: 'staffId', type: String })
  @ApiOkResponse({ description: 'Created or updated teacher profile' })
  @ApiNotFoundResponse({
    description: 'Staff member does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.update permission' })
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: UpsertTeacherProfileDto,
  ) {
    return this.teacherProfilesService.upsert(user.activeSchoolId, staffId, dto);
  }
}