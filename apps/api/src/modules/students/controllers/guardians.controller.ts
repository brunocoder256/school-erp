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
import { CreateGuardianDto } from '../dto/create-guardian.dto';
import { UpdateGuardianDto } from '../dto/update-guardian.dto';
import { GuardiansService } from '../services/guardians.service';

/**
 * Guardian administration nested under a student of the active school.
 *
 * The tenant relationship guardian → student → activeSchoolId is verified by
 * the service on every operation. Client-supplied school IDs are never
 * honored.
 */
@ApiTags('guardians')
@ApiBearerAuth()
@Controller('students/:studentId/guardians')
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('students.create')
  @ApiOperation({ summary: 'Associate a guardian with a student' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiCreatedResponse({ description: 'Created guardian' })
  @ApiNotFoundResponse({
    description: 'Student does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing students.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: CreateGuardianDto,
  ) {
    return this.guardiansService.create(user.activeSchoolId, studentId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('students.read')
  @ApiOperation({ summary: 'List guardians of a student' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiOkResponse({ description: 'Guardians of the student' })
  @ApiNotFoundResponse({
    description: 'Student does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing students.read permission' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.guardiansService.listByStudent(user.activeSchoolId, studentId);
  }

  @Patch(':guardianId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('students.update')
  @ApiOperation({ summary: 'Update a guardian of a student' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiParam({ name: 'guardianId', type: String })
  @ApiOkResponse({ description: 'Updated guardian' })
  @ApiNotFoundResponse({
    description: 'Student or guardian does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing students.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('guardianId', ParseUUIDPipe) guardianId: string,
    @Body() dto: UpdateGuardianDto,
  ) {
    return this.guardiansService.update(
      user.activeSchoolId,
      studentId,
      guardianId,
      dto,
    );
  }

  @Delete(':guardianId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('students.update')
  @ApiOperation({ summary: 'Remove a guardian from a student' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiParam({ name: 'guardianId', type: String })
  @ApiOkResponse({ description: 'Guardian removed' })
  @ApiNotFoundResponse({
    description: 'Student or guardian does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing students.update permission',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('guardianId', ParseUUIDPipe) guardianId: string,
  ) {
    return this.guardiansService.delete(
      user.activeSchoolId,
      studentId,
      guardianId,
    );
  }
}
