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
import { CreateStudentProgressionDto } from '../dto/create-student-progression.dto';
import { UpdateStudentProgressionDto } from '../dto/update-student-progression.dto';
import { StudentProgressionsService } from '../services/student-progressions.service';

@ApiTags('student-progressions')
@ApiBearerAuth()
@Controller('student-progressions')
export class StudentProgressionsController {
  constructor(
    private readonly studentProgressionsService: StudentProgressionsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('student_progressions.create')
  @ApiOperation({ summary: 'Create a progression recommendation for a report card' })
  @ApiCreatedResponse({ description: 'Created student progression record' })
  @ApiForbiddenResponse({ description: 'Missing student_progressions.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStudentProgressionDto,
  ) {
    return this.studentProgressionsService.create(user.activeSchoolId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('student_progressions.read')
  @ApiOperation({ summary: 'List progression records for the active school' })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiOkResponse({ description: 'Progression records of the active school' })
  @ApiForbiddenResponse({ description: 'Missing student_progressions.read permission' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('studentId') studentId?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.studentProgressionsService.list(
      user.activeSchoolId,
      studentId,
      academicYearId,
    );
  }

  @Get(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('student_progressions.read')
  @ApiOperation({ summary: 'Get a progression record of the active school' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Progression record' })
  @ApiNotFoundResponse({ description: 'Progression record does not belong to this school' })
  @ApiForbiddenResponse({ description: 'Missing student_progressions.read permission' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.studentProgressionsService.get(user.activeSchoolId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('student_progressions.update')
  @ApiOperation({ summary: 'Update a progression record' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ description: 'Updated progression record' })
  @ApiForbiddenResponse({ description: 'Missing student_progressions.update permission' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentProgressionDto,
  ) {
    return this.studentProgressionsService.update(user.activeSchoolId, id, dto);
  }
}
