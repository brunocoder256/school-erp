import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
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
import { SetAssessmentScoresDto } from '../dto/set-assessment-scores.dto';
import { AssessmentScoresService } from '../services/assessment-scores.service';

@ApiTags('assessment-scores')
@ApiBearerAuth()
@Controller('assessments/:assessmentId/scores')
export class AssessmentScoresController {
  constructor(
    private readonly assessmentScoresService: AssessmentScoresService,
  ) {}

  @Put()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('assessment_scores.update')
  @ApiOperation({
    summary: 'Record or update component scores for an assessment',
    description:
      'Absent learners are recorded without a score (absent is not zero). Only administrators or assigned teachers may record scores.',
  })
  @ApiParam({ name: 'assessmentId', type: String })
  @ApiCreatedResponse({ description: 'Recorded assessment scores' })
  @ApiForbiddenResponse({
    description: 'Missing assessment_scores.update permission or no teaching assignment',
  })
  @ApiNotFoundResponse({ description: 'Assessment does not belong to this school' })
  setScores(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Body() dto: SetAssessmentScoresDto,
  ) {
    return this.assessmentScoresService.setScores(
      user.activeSchoolId,
      user,
      assessmentId,
      dto,
    );
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('assessment_scores.read')
  @ApiOperation({ summary: 'List the component scores of an assessment' })
  @ApiParam({ name: 'assessmentId', type: String })
  @ApiOkResponse({ description: 'Assessment component scores' })
  @ApiForbiddenResponse({ description: 'Missing assessment_scores.read permission' })
  @ApiNotFoundResponse({ description: 'Assessment does not belong to this school' })
  listScores(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
  ) {
    return this.assessmentScoresService.listScores(user.activeSchoolId, assessmentId);
  }
}