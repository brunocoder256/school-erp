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
import { ListResultsQueryDto } from '../dto/list-results-query.dto';
import { AmendResultDto, ResultActionDto } from '../dto/result-actions.dto';
import { ResultsService } from '../services/results.service';

@ApiTags('results')
@ApiBearerAuth()
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post('generate')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('results.create')
  @ApiOperation({
    summary: 'Generate draft results for an assessment',
    description:
      'Calculates the final score, grade, descriptor and achievement level of every assessed learner. Only draft results are recalculated; finalized results are protected.',
  })
  @ApiParam({ name: 'assessmentId', type: String })
  @ApiCreatedResponse({ description: 'Generated draft learner results' })
  @ApiForbiddenResponse({
    description: 'Missing results.create permission or no teaching assignment',
  })
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Query('assessmentId') assessmentId: string,
  ) {
    return this.resultsService.generate(user.activeSchoolId, user, assessmentId);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('results.read')
  @ApiOperation({ summary: 'List learner results of the active school' })
  @ApiQuery({ name: 'assessmentId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'enrollmentId', required: false, type: String })
  @ApiOkResponse({ description: 'Learner results of the active school' })
  @ApiForbiddenResponse({ description: 'Missing results.read permission' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListResultsQueryDto) {
    return this.resultsService.list(user.activeSchoolId, query);
  }

  @Post('submit')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('results.update')
  @ApiOperation({ summary: 'Submit draft results for approval' })
  @ApiOkResponse({ description: 'Submitted learner results' })
  @ApiForbiddenResponse({
    description: 'Missing results.update permission or no teaching assignment',
  })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResultActionDto,
  ) {
    return this.resultsService.submit(user.activeSchoolId, user, dto);
  }

  @Post('approve')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('results.approve')
  @ApiOperation({ summary: 'Approve submitted results' })
  @ApiOkResponse({ description: 'Approved learner results' })
  @ApiForbiddenResponse({ description: 'Missing results.approve permission' })
  approve(@CurrentUser() user: AuthenticatedUser, @Body() dto: ResultActionDto) {
    return this.resultsService.approve(user.activeSchoolId, dto);
  }

  @Post('lock')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('results.lock')
  @ApiOperation({ summary: 'Lock approved results against further changes' })
  @ApiOkResponse({ description: 'Locked learner results' })
  @ApiForbiddenResponse({ description: 'Missing results.lock permission' })
  lock(@CurrentUser() user: AuthenticatedUser, @Body() dto: ResultActionDto) {
    return this.resultsService.lock(user.activeSchoolId, dto);
  }

  @Post('amend')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('results.amend')
  @ApiOperation({
    summary: 'Amend a finalized result, preserving its history',
    description:
      'Creates a ResultAmendment with the previous values and marks the result as amended.',
  })
  @ApiOkResponse({ description: 'Amended learner result' })
  @ApiForbiddenResponse({ description: 'Missing results.amend permission' })
  @ApiNotFoundResponse({ description: 'Learner result does not belong to this school' })
  amend(@CurrentUser() user: AuthenticatedUser, @Body() dto: AmendResultDto) {
    return this.resultsService.amend(user.activeSchoolId, user, dto);
  }
}