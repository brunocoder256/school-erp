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
import { CreateQualificationDto } from '../dto/create-qualification.dto';
import { UpdateQualificationDto } from '../dto/update-qualification.dto';
import { QualificationsService } from '../services/qualifications.service';

/**
 * Staff qualification administration nested under a staff member of the
 * active school. Qualifications are optional structured records.
 */
@ApiTags('qualifications')
@ApiBearerAuth()
@Controller('staff/:staffId/qualifications')
export class QualificationsController {
  constructor(private readonly qualificationsService: QualificationsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.create')
  @ApiOperation({ summary: 'Add a qualification to a staff member' })
  @ApiParam({ name: 'staffId', type: String })
  @ApiCreatedResponse({ description: 'Created qualification' })
  @ApiNotFoundResponse({
    description: 'Staff member does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: CreateQualificationDto,
  ) {
    return this.qualificationsService.create(user.activeSchoolId, staffId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.read')
  @ApiOperation({ summary: 'List qualifications of a staff member' })
  @ApiParam({ name: 'staffId', type: String })
  @ApiOkResponse({ description: 'Qualifications of the staff member' })
  @ApiNotFoundResponse({
    description: 'Staff member does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.read permission' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ) {
    return this.qualificationsService.list(user.activeSchoolId, staffId);
  }

  @Patch(':qualificationId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.update')
  @ApiOperation({ summary: 'Update a qualification of a staff member' })
  @ApiParam({ name: 'staffId', type: String })
  @ApiParam({ name: 'qualificationId', type: String })
  @ApiOkResponse({ description: 'Updated qualification' })
  @ApiNotFoundResponse({
    description: 'Staff member or qualification does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.update permission' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Param('qualificationId', ParseUUIDPipe) qualificationId: string,
    @Body() dto: UpdateQualificationDto,
  ) {
    return this.qualificationsService.update(
      user.activeSchoolId,
      staffId,
      qualificationId,
      dto,
    );
  }

  @Delete(':qualificationId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('staff.delete')
  @ApiOperation({ summary: 'Delete a qualification of a staff member' })
  @ApiParam({ name: 'staffId', type: String })
  @ApiParam({ name: 'qualificationId', type: String })
  @ApiOkResponse({ description: 'Qualification deleted' })
  @ApiNotFoundResponse({
    description: 'Staff member or qualification does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing staff.delete permission' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Param('qualificationId', ParseUUIDPipe) qualificationId: string,
  ) {
    return this.qualificationsService.delete(
      user.activeSchoolId,
      staffId,
      qualificationId,
    );
  }
}