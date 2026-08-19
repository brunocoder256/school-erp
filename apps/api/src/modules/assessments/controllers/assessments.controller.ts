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
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { ListAssessmentsQueryDto } from '../dto/list-assessments-query.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import { AssessmentsService } from '../services/assessments.service';

@ApiTags('assessments')
@ApiBearerAuth()
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('assessments.create')
  @ApiOperation({ summary: 'Create an assessment anchored to the academic context' })
  @ApiCreatedResponse({ description: 'Created assessment with its components' })
  @ApiForbiddenResponse({ description: 'Missing assessments.create permission' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAssessmentDto) {
    return this.assessmentsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('assessments.read')
  @ApiOperation({ summary: 'List assessments of the active school' })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'termId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'academicClassId', required: false, type: String })
  @ApiQuery({ name: 'streamId', required: false, type: String })
  @ApiOkResponse({ description: 'Assessments of the active school' })
  @ApiForbiddenResponse({ description: 'Missing assessments.read permission' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAssessmentsQueryDto,
  ) {
    return this.assessmentsService.list(user.activeSchoolId, query);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('assessments.read')
  @ApiOperation({ summary: 'Get an assessment with its components' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Assessment with components' })
  @ApiNotFoundResponse({ description: 'Assessment does not belong to this school' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentsService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('assessments.update')
  @ApiOperation({ summary: 'Update an assessment' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated assessment' })
  @ApiNotFoundResponse({ description: 'Assessment does not belong to this school' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return this.assessmentsService.update(user.activeSchoolId, id, dto);
  }

  @Post(':id/complete')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('assessments.update')
  @ApiOperation({ summary: 'Complete an assessment (stops further editing)' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Completed assessment' })
  @ApiNotFoundResponse({ description: 'Assessment does not belong to this school' })
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.assessmentsService.complete(user.activeSchoolId, id);
  }
}