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
import { CreateAssessmentSchemeDto } from '../dto/create-assessment-scheme.dto';
import { CreateSchemeVersionDto } from '../dto/create-scheme-version.dto';
import { UpdateAssessmentSchemeDto } from '../dto/update-assessment-scheme.dto';
import { AssessmentSchemesService } from '../services/assessment-schemes.service';

@ApiTags('assessment-schemes')
@ApiBearerAuth()
@Controller('assessment-schemes')
export class AssessmentSchemesController {
  constructor(
    private readonly assessmentSchemesService: AssessmentSchemesService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('assessment_schemes.create')
  @ApiOperation({ summary: 'Create an assessment scheme with its first version' })
  @ApiCreatedResponse({ description: 'Created assessment scheme' })
  @ApiForbiddenResponse({
    description: 'Missing assessment_schemes.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAssessmentSchemeDto,
  ) {
    return this.assessmentSchemesService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('assessment_schemes.read')
  @ApiOperation({ summary: 'List assessment schemes of the active school' })
  @ApiOkResponse({ description: 'Assessment schemes of the active school' })
  @ApiForbiddenResponse({
    description: 'Missing assessment_schemes.read permission',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.assessmentSchemesService.list(user.activeSchoolId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('assessment_schemes.read')
  @ApiOperation({ summary: 'Get an assessment scheme with its versions' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Assessment scheme with versions' })
  @ApiNotFoundResponse({
    description: 'Assessment scheme does not belong to this school',
  })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentSchemesService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('assessment_schemes.update')
  @ApiOperation({ summary: 'Update or deactivate an assessment scheme' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated assessment scheme' })
  @ApiNotFoundResponse({
    description: 'Assessment scheme does not belong to this school',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentSchemeDto,
  ) {
    return this.assessmentSchemesService.update(user.activeSchoolId, id, dto);
  }

  @Post(':id/versions')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('assessment_schemes.update')
  @ApiOperation({ summary: 'Create a new draft version of an assessment scheme' })
  @ApiParam({ name: 'id', type: String })
  @ApiCreatedResponse({ description: 'Created assessment scheme version' })
  createVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSchemeVersionDto,
  ) {
    return this.assessmentSchemesService.createVersion(user.activeSchoolId, id, dto);
  }

  @Post(':id/versions/:versionId/activate')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('assessment_schemes.update')
  @ApiOperation({
    summary: 'Activate a scheme version (archives the previous active version)',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'versionId', type: String })
  @ApiOkResponse({ description: 'Activated assessment scheme version' })
  activateVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.assessmentSchemesService.activateVersion(user.activeSchoolId, id, versionId);
  }
}