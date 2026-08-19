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
import { CreateGradingSchemeDto } from '../dto/create-grading-scheme.dto';
import { CreateGradingVersionDto } from '../dto/create-grading-version.dto';
import { UpdateGradingSchemeDto } from '../dto/update-grading-scheme.dto';
import { GradingSchemesService } from '../services/grading-schemes.service';

@ApiTags('grading-schemes')
@ApiBearerAuth()
@Controller('grading-schemes')
export class GradingSchemesController {
  constructor(private readonly gradingSchemesService: GradingSchemesService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('grading_schemes.create')
  @ApiOperation({ summary: 'Create a grading scheme with its first version' })
  @ApiCreatedResponse({ description: 'Created grading scheme' })
  @ApiForbiddenResponse({ description: 'Missing grading_schemes.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGradingSchemeDto,
  ) {
    return this.gradingSchemesService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('grading_schemes.read')
  @ApiOperation({ summary: 'List grading schemes of the active school' })
  @ApiOkResponse({ description: 'Grading schemes of the active school' })
  @ApiForbiddenResponse({ description: 'Missing grading_schemes.read permission' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.gradingSchemesService.list(user.activeSchoolId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('grading_schemes.read')
  @ApiOperation({ summary: 'Get a grading scheme with its versions' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Grading scheme with versions' })
  @ApiNotFoundResponse({
    description: 'Grading scheme does not belong to this school',
  })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.gradingSchemesService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('grading_schemes.update')
  @ApiOperation({ summary: 'Update or deactivate a grading scheme' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated grading scheme' })
  @ApiNotFoundResponse({
    description: 'Grading scheme does not belong to this school',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGradingSchemeDto,
  ) {
    return this.gradingSchemesService.update(user.activeSchoolId, id, dto);
  }

  @Post(':id/versions')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('grading_schemes.update')
  @ApiOperation({ summary: 'Create a new draft version of a grading scheme' })
  @ApiParam({ name: 'id', type: String })
  @ApiCreatedResponse({ description: 'Created grading scheme version' })
  createVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGradingVersionDto,
  ) {
    return this.gradingSchemesService.createVersion(user.activeSchoolId, id, dto);
  }

  @Post(':id/versions/:versionId/activate')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('grading_schemes.update')
  @ApiOperation({
    summary: 'Activate a grading version (archives the previous active version)',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'versionId', type: String })
  @ApiOkResponse({ description: 'Activated grading scheme version' })
  activateVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.gradingSchemesService.activateVersion(user.activeSchoolId, id, versionId);
  }
}