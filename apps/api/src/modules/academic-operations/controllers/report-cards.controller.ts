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
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { Permissions } from '../../identity/decorators/permissions.decorator';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PermissionGuard } from '../../identity/guards/permission.guard';
import type { AuthenticatedUser } from '../../identity/types/authenticated-request';
import { CreateReportCardDto, UpdateReportCardDto } from '../dto/report-card-line.dto';
import { ListReportCardsQueryDto } from '../dto/list-report-cards-query.dto';
import { ReportCardsService } from '../services/report-cards.service';

@ApiTags('report-cards')
@ApiBearerAuth()
@Controller('report-cards')
export class ReportCardsController {
  constructor(private readonly reportCardsService: ReportCardsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('report_cards.create')
  @ApiOperation({ summary: 'Create a report card for an enrollment' })
  @ApiCreatedResponse({ description: 'Created report card' })
  @ApiForbiddenResponse({ description: 'Missing report_cards.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportCardDto,
  ) {
    return this.reportCardsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('report_cards.read')
  @ApiOperation({ summary: 'List report cards for the active school' })
  @ApiOkResponse({ description: 'List of report cards' })
  @ApiForbiddenResponse({ description: 'Missing report_cards.read permission' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListReportCardsQueryDto,
  ) {
    return this.reportCardsService.list(user.activeSchoolId, query);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('report_cards.read')
  @ApiOperation({ summary: 'Get a report card of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Report card' })
  @ApiNotFoundResponse({ description: 'Report card does not belong to this school' })
  @ApiForbiddenResponse({ description: 'Missing report_cards.read permission' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportCardsService.get(user.activeSchoolId, id);
  }

  @Get('transcript/:studentId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('transcripts.read')
  @ApiOperation({ summary: 'Generate transcript summary for a student' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiOkResponse({ description: 'Student transcript summary' })
  @ApiForbiddenResponse({ description: 'Missing transcripts.read permission' })
  getTranscript(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.reportCardsService.getTranscript(user.activeSchoolId, studentId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('report_cards.update')
  @ApiOperation({ summary: 'Update a report card' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated report card' })
  @ApiForbiddenResponse({ description: 'Missing report_cards.update permission' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportCardDto,
  ) {
    return this.reportCardsService.update(user.activeSchoolId, id, dto);
  }

  @Patch(':id/approve')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('report_cards.approve')
  @ApiOperation({ summary: 'Approve a report card' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Approved report card' })
  @ApiForbiddenResponse({ description: 'Missing report_cards.approve permission' })
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportCardsService.approve(user.activeSchoolId, id);
  }
}
