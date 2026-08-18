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
import { CreateProgressionDto } from '../dto/create-progression.dto';
import { UpdateProgressionDto } from '../dto/update-progression.dto';
import { ProgressionsService } from '../services/progressions.service';

/**
 * Academic level progression administration for the active school.
 * Progression rules (P7 -> S1, S1 -> S2, ...) are configurable data, never
 * hard-coded logic.
 */
@ApiTags('progressions')
@ApiBearerAuth()
@Controller('progressions')
export class ProgressionsController {
  constructor(private readonly progressionsService: ProgressionsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.create')
  @ApiOperation({
    summary: 'Create a progression rule between two levels of the active school',
  })
  @ApiCreatedResponse({ description: 'Created progression rule' })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProgressionDto,
  ) {
    return this.progressionsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.read')
  @ApiOperation({ summary: 'List progression rules of the active school' })
  @ApiOkResponse({ description: 'Progression rules of the active school' })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.read permission',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.progressionsService.list(user.activeSchoolId);
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.read')
  @ApiOperation({ summary: 'Get a progression rule of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Progression rule' })
  @ApiNotFoundResponse({
    description: 'Progression does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.read permission',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.progressionsService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.update')
  @ApiOperation({ summary: 'Update a progression rule of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated progression rule' })
  @ApiNotFoundResponse({
    description: 'Progression does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgressionDto,
  ) {
    return this.progressionsService.update(user.activeSchoolId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.delete')
  @ApiOperation({ summary: 'Delete a progression rule of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Progression rule deleted' })
  @ApiNotFoundResponse({
    description: 'Progression does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.delete permission',
  })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.progressionsService.delete(user.activeSchoolId, id);
  }
}
