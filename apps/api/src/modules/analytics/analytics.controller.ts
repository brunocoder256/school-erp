import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { Permissions } from '../identity/decorators/permissions.decorator';
import { AuthGuard } from '../identity/guards/auth.guard';
import { PermissionGuard } from '../identity/guards/permission.guard';
import { AnalyticsService } from './analytics.service';
import { StudentPerformanceQueryDto, StudentRankingQueryDto } from './dto/student-performance.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('students/:studentId/performance')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Get student performance summary with subject breakdown' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'termId', required: false, type: String })
  @ApiOkResponse({ description: 'Student performance summary' })
  async studentPerformance(
    @Param('studentId') studentId: string,
    @Query() query: StudentPerformanceQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.studentPerformanceSummary(
      studentId,
      user.activeSchoolId!,
      query.academicYearId,
      query.termId,
    );
  }

  @Get('students/:studentId/trend')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Get student academic trend across periods' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiOkResponse({ description: 'Student academic trend analysis' })
  async studentTrend(
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.studentAcademicTrend(
      studentId,
      user.activeSchoolId!,
    );
  }

  @Get('students/:studentId/strengths-weaknesses')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Get student strengths and weaknesses analysis' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'termId', required: false, type: String })
  @ApiOkResponse({ description: 'Student strengths and weaknesses' })
  async studentStrengthsWeaknesses(
    @Param('studentId') studentId: string,
    @Query() query: StudentPerformanceQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.studentStrengthsWeaknesses(
      studentId,
      user.activeSchoolId!,
      query.academicYearId,
      query.termId,
    );
  }

  @Get('students/:studentId/completion')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Get student result completion status' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiOkResponse({ description: 'Student result completion' })
  async studentCompletion(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId: string | undefined,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.studentResultCompletion(
      studentId,
      user.activeSchoolId!,
      academicYearId,
    );
  }

  @Get('students/:studentId/distribution')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Get student score/grade/achievement distribution' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'termId', required: false, type: String })
  @ApiOkResponse({ description: 'Student distribution analysis' })
  async studentDistribution(
    @Param('studentId') studentId: string,
    @Query() query: StudentPerformanceQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.studentDistributionAnalysis(
      studentId,
      user.activeSchoolId!,
      query.academicYearId,
      query.termId,
    );
  }

  @Get('students/:studentId/period-comparison')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Compare student performance across periods' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiOkResponse({ description: 'Student period comparison' })
  async studentPeriodComparison(
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId: string,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.studentPeriodComparison(
      studentId,
      user.activeSchoolId!,
      academicYearId,
    );
  }

  @Get('students/:studentId/ranking')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Get student ranking display from M12 policies' })
  @ApiParam({ name: 'studentId', type: String })
  @ApiOkResponse({ description: 'Student ranking display' })
  async studentRanking(
    @Param('studentId') studentId: string,
    @Query() query: StudentRankingQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.studentRankingDisplay(
      studentId,
      user.activeSchoolId!,
      query.academicYearId,
      query.subjectId,
      query.policyId,
      query.scope,
      query.academicClassId,
      query.streamId,
      query.termId,
    );
  }
}
