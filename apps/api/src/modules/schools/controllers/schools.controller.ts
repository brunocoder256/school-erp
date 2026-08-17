import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { Permissions } from '../../identity/decorators/permissions.decorator';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PermissionGuard } from '../../identity/guards/permission.guard';
import type { AuthenticatedUser } from '../../identity/types/authenticated-request';
import { CreateSchoolDto } from '../dto/create-school.dto';
import { UpdateSchoolDto } from '../dto/update-school.dto';
import { SchoolsService } from '../services/schools.service';

@ApiTags('schools')
@ApiBearerAuth()
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  /**
   * Current active school for the authenticated user.
   * School ID is taken only from JWT → AuthGuard → activeSchoolId.
   */
  @Get('me')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('schools.read')
  @ApiOperation({ summary: 'Get the authenticated user\'s active school' })
  @ApiOkResponse({ description: 'Active school profile' })
  getCurrentSchool(@CurrentUser() user: AuthenticatedUser) {
    return this.schoolsService.getCurrentSchool(user.id, user.activeSchoolId);
  }

  /**
   * Update profile fields on the authenticated user's active school.
   */
  @Patch('me')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('schools.update')
  @ApiOperation({ summary: 'Update the authenticated user\'s active school' })
  @ApiOkResponse({ description: 'Updated school profile' })
  updateCurrentSchool(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSchoolDto,
  ) {
    return this.schoolsService.updateCurrentSchool(
      user.id,
      user.activeSchoolId,
      dto,
    );
  }

  /**
   * System-level school creation — requires seeded `schools.create` permission.
   * Does not accept client-supplied school IDs for authorization.
   */
  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('schools.create')
  @ApiOperation({ summary: 'Create a school (system administration)' })
  @ApiCreatedResponse({ description: 'Created school' })
  createSchool(@Body() dto: CreateSchoolDto) {
    return this.schoolsService.createSchool(dto);
  }
}
