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
import { CreateExaminationDto } from '../dto/create-examination.dto';
import { UpdateExaminationDto } from '../dto/update-examination.dto';
import { ExaminationsService } from '../services/examinations.service';

@ApiTags('examinations')
@ApiBearerAuth()
@Controller('examinations')
export class ExaminationsController {
  constructor(private readonly examinationsService: ExaminationsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('examinations.create')
  @ApiOperation({ summary: 'Create an examination with its papers' })
  @ApiCreatedResponse({ description: 'Created examination with papers' })
  @ApiForbiddenResponse({ description: 'Missing examinations.create permission' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExaminationDto) {
    return this.examinationsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('examinations.read')
  @ApiOperation({ summary: 'List examinations of the active school' })
  @ApiOkResponse({ description: 'Examinations of the active school' })
  @ApiForbiddenResponse({ description: 'Missing examinations.read permission' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.examinationsService.list(user.activeSchoolId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('examinations.read')
  @ApiOperation({ summary: 'Get an examination with its papers' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Examination with papers' })
  @ApiNotFoundResponse({ description: 'Examination does not belong to this school' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.examinationsService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('examinations.update')
  @ApiOperation({ summary: 'Update an examination' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated examination' })
  @ApiNotFoundResponse({ description: 'Examination does not belong to this school' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExaminationDto,
  ) {
    return this.examinationsService.update(user.activeSchoolId, id, dto);
  }
}