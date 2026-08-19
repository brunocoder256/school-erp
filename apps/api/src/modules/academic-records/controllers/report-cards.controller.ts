import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import {
  AddReportCommentDto,
  AmendReportCardDto,
  GenerateReportCardDto,
} from '../dto/report-cards-action.dto';
import { ListReportCardsQueryDto } from '../dto/report-cards-query.dto';
import { ReportCardsService } from '../services/report-cards.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportCardsController {
  constructor(private readonly reportCardsService: ReportCardsService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('reports.read')
  @ApiOperation({ summary: 'List report cards of the active school' })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'termId', required: false, type: String })
  @ApiOkResponse({ description: 'Report cards of the active school' })
  @ApiForbiddenResponse({ description: 'Missing reports.read permission' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListReportCardsQueryDto,
  ) {
    return this.reportCardsService.list(user.activeSchoolId, query);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get a single report card with its snapshot entries and comments' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Report card' })
  @ApiForbiddenResponse({ description: 'Missing reports.read permission' })
  @ApiNotFoundResponse({ description: 'Report card not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportCardsService.findOne(user.activeSchoolId, id);
  }

  @Post('generate')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('reports.create')
  @ApiOperation({
    summary: 'Generate a report card from finalized M12 results',
    description:
      'Snapshots finalized learner results into an immutable report card. The academic context (class, stream, level, section) is resolved from the student enrollment.',
  })
  @ApiCreatedResponse({ description: 'Generated report card' })
  @ApiForbiddenResponse({ description: 'Missing reports.create permission' })
  @ApiNotFoundResponse({
    description: 'Student, enrollment or template version not found',
  })
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateReportCardDto,
  ) {
    return this.reportCardsService.generate(user.activeSchoolId, user, dto);
  }

  @Post(':id/approve')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('reports.approve')
  @ApiOperation({ summary: 'Approve a generated report card' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Approved report card' })
  @ApiForbiddenResponse({ description: 'Missing reports.approve permission' })
  @ApiNotFoundResponse({ description: 'Report card not found' })
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportCardsService.approve(user.activeSchoolId, user, id);
  }

  @Post(':id/issue')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('reports.issue')
  @ApiOperation({
    summary: 'Issue an approved report card',
    description: 'Freezes the snapshot so later changes cannot rewrite the historical report.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Issued report card' })
  @ApiForbiddenResponse({ description: 'Missing reports.issue permission' })
  @ApiNotFoundResponse({ description: 'Report card not found' })
  issue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportCardsService.issue(user.activeSchoolId, user, id);
  }

  @Post(':id/amend')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('reports.amend')
  @ApiOperation({
    summary: 'Amend an issued report card, preserving its history',
    description:
      'Creates a ReportCardAmendment with the previous and new statuses, the actor, the reason and the timestamp.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Amended report card' })
  @ApiForbiddenResponse({ description: 'Missing reports.amend permission' })
  @ApiNotFoundResponse({ description: 'Report card not found' })
  amend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AmendReportCardDto,
  ) {
    return this.reportCardsService.amend(user.activeSchoolId, user, id, dto);
  }

  @Post(':id/comments')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('report_comments.create')
  @ApiOperation({
    summary: 'Add a teacher, class-teacher or head-teacher comment',
    description: 'Comments belong to the correct report and remain historically preserved after issue.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiCreatedResponse({ description: 'Added comment' })
  @ApiForbiddenResponse({
    description: 'Missing report_comments.create permission',
  })
  @ApiNotFoundResponse({ description: 'Report card not found' })
  addComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddReportCommentDto,
  ) {
    return this.reportCardsService.addComment(user.activeSchoolId, user, id, dto);
  }
}
