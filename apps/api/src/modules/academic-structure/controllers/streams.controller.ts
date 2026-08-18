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
import { CreateStreamDto } from '../dto/create-stream.dto';
import { UpdateStreamDto } from '../dto/update-stream.dto';
import { StreamsService } from '../services/streams.service';

/**
 * Stream administration nested under a class of the active school.
 * Reuses the existing Stream model (no duplicate).
 */
@ApiTags('streams')
@ApiBearerAuth()
@Controller('classes/:classId/streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.create')
  @ApiOperation({ summary: 'Create a stream in an academic class' })
  @ApiParam({ name: 'classId', type: String })
  @ApiCreatedResponse({ description: 'Created stream' })
  @ApiNotFoundResponse({
    description: 'Class does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.create permission',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateStreamDto,
  ) {
    return this.streamsService.create(user.activeSchoolId, classId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.read')
  @ApiOperation({ summary: 'List streams of an academic class' })
  @ApiParam({ name: 'classId', type: String })
  @ApiOkResponse({ description: 'Streams of the class' })
  @ApiNotFoundResponse({
    description: 'Class does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.read permission',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId', ParseUUIDPipe) classId: string,
  ) {
    return this.streamsService.list(user.activeSchoolId, classId);
  }

  @Get(':streamId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.read')
  @ApiOperation({ summary: 'Get a stream of an academic class' })
  @ApiParam({ name: 'classId', type: String })
  @ApiParam({ name: 'streamId', type: String })
  @ApiOkResponse({ description: 'Stream' })
  @ApiNotFoundResponse({
    description: 'Class or stream does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.read permission',
  })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('streamId', ParseUUIDPipe) streamId: string,
  ) {
    return this.streamsService.get(user.activeSchoolId, classId, streamId);
  }

  @Patch(':streamId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.update')
  @ApiOperation({ summary: 'Update a stream of an academic class' })
  @ApiParam({ name: 'classId', type: String })
  @ApiParam({ name: 'streamId', type: String })
  @ApiOkResponse({ description: 'Updated stream' })
  @ApiNotFoundResponse({
    description: 'Class or stream does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.update permission',
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('streamId', ParseUUIDPipe) streamId: string,
    @Body() dto: UpdateStreamDto,
  ) {
    return this.streamsService.update(user.activeSchoolId, classId, streamId, dto);
  }

  @Delete(':streamId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('academic_structure.delete')
  @ApiOperation({
    summary: 'Delete a stream that has no enrollments',
  })
  @ApiParam({ name: 'classId', type: String })
  @ApiParam({ name: 'streamId', type: String })
  @ApiOkResponse({ description: 'Stream deleted' })
  @ApiNotFoundResponse({
    description: 'Class or stream does not belong to this school',
  })
  @ApiForbiddenResponse({
    description: 'Missing academic_structure.delete permission',
  })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('streamId', ParseUUIDPipe) streamId: string,
  ) {
    return this.streamsService.delete(user.activeSchoolId, classId, streamId);
  }
}
