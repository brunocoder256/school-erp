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
import {
  CreateReportTemplateDto,
  CreateReportTemplateVersionDto,
  UpdateReportTemplateDto,
} from '../dto/report-templates.dto';
import { ReportTemplatesService } from '../services/report-templates.service';

@ApiTags('report-templates')
@ApiBearerAuth()
@Controller('report-templates')
export class ReportTemplatesController {
  constructor(
    private readonly reportTemplatesService: ReportTemplatesService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('report_templates.create')
  @ApiOperation({ summary: 'Create a report-card template' })
  @ApiCreatedResponse({ description: 'Created report-card template' })
  @ApiForbiddenResponse({
    description: 'Missing report_templates.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportTemplateDto,
  ) {
    return this.reportTemplatesService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('report_templates.read')
  @ApiOperation({ summary: 'List report-card templates of the active school' })
  @ApiOkResponse({ description: 'Report-card templates of the active school' })
  @ApiForbiddenResponse({
    description: 'Missing report_templates.read permission',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.reportTemplatesService.list(user.activeSchoolId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('report_templates.read')
  @ApiOperation({ summary: 'Get a single report-card template' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Report-card template' })
  @ApiForbiddenResponse({
    description: 'Missing report_templates.read permission',
  })
  @ApiNotFoundResponse({ description: 'Report template not found' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportTemplatesService.findOne(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('report_templates.update')
  @ApiOperation({ summary: 'Update a report-card template' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated report-card template' })
  @ApiForbiddenResponse({
    description: 'Missing report_templates.update permission',
  })
  @ApiNotFoundResponse({ description: 'Report template not found' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportTemplateDto,
  ) {
    return this.reportTemplatesService.update(user.activeSchoolId, id, dto);
  }

  @Post(':templateId/versions')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('report_templates.create')
  @ApiOperation({
    summary: 'Create a version of a report-card template',
    description:
      'A version carries the immutable section layout so issued reports keep their structure.',
  })
  @ApiParam({ name: 'templateId', type: String })
  @ApiCreatedResponse({ description: 'Created report template version' })
  @ApiForbiddenResponse({
    description: 'Missing report_templates.create permission',
  })
  @ApiNotFoundResponse({ description: 'Report template not found' })
  createVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: CreateReportTemplateVersionDto,
  ) {
    return this.reportTemplatesService.createVersion(
      user.activeSchoolId,
      templateId,
      dto,
    );
  }
}
