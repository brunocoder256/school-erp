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
import { CreateSubjectOfferingDto } from '../dto/create-subject-offering.dto';
import { UpdateSubjectOfferingDto } from '../dto/update-subject-offering.dto';
import { SubjectOfferingsService } from '../services/subject-offerings.service';

/**
 * Subject offering administration for the authenticated user's active school.
 * An offering is distinct from the subject catalog and from learner subject
 * selections.
 */
@ApiTags('subject-offerings')
@ApiBearerAuth()
@Controller('subject-offerings')
export class SubjectOfferingsController {
  constructor(
    private readonly subjectOfferingsService: SubjectOfferingsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subject_offerings.create')
  @ApiOperation({
    summary: 'Offer a subject at a level for an academic year',
  })
  @ApiCreatedResponse({ description: 'Created subject offering' })
  @ApiForbiddenResponse({
    description: 'Missing subject_offerings.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubjectOfferingDto,
  ) {
    return this.subjectOfferingsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subject_offerings.read')
  @ApiOperation({ summary: 'List subject offerings of the active school' })
  @ApiOkResponse({ description: 'Subject offerings of the active school' })
  @ApiForbiddenResponse({
    description: 'Missing subject_offerings.read permission',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.subjectOfferingsService.list(user.activeSchoolId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subject_offerings.read')
  @ApiOperation({ summary: 'Get a subject offering of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Subject offering' })
  @ApiNotFoundResponse({
    description: 'Subject offering does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing subject_offerings.read permission',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subjectOfferingsService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subject_offerings.update')
  @ApiOperation({ summary: 'Update a subject offering of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated subject offering' })
  @ApiNotFoundResponse({
    description: 'Subject offering does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing subject_offerings.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubjectOfferingDto,
  ) {
    return this.subjectOfferingsService.update(user.activeSchoolId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('subject_offerings.delete')
  @ApiOperation({ summary: 'Delete a subject offering of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Subject offering deleted' })
  @ApiNotFoundResponse({
    description: 'Subject offering does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing subject_offerings.delete permission',
  })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subjectOfferingsService.delete(user.activeSchoolId, id);
  }
}