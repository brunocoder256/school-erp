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
import {
  StudentPerformanceQueryDto,
  StudentRankingQueryDto,
} from './dto/student-performance.dto';
import {
  GroupPerformanceQueryDto,
  GroupPeriodComparisonQueryDto,
  ComparisonQueryDto,
} from './dto/group-analytics.dto';

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

  // -----------------------------------------------------------------------
  // M22-P3: Class, Stream & Subject Analytics
  // -----------------------------------------------------------------------

  @Get('classes/:classId/performance')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Get class performance summary' })
  @ApiParam({ name: 'classId', type: String })
  @ApiOkResponse({ description: 'Class performance summary' })
  async classPerformance(
    @Param('classId') classId: string,
    @Query() query: GroupPerformanceQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.classPerformanceSummary(
      classId,
      user.activeSchoolId!,
      query.academicYearId,
      query.termId,
      query.subjectId,
    );
  }

  @Get('streams/:streamId/performance')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Get stream performance summary' })
  @ApiParam({ name: 'streamId', type: String })
  @ApiOkResponse({ description: 'Stream performance summary' })
  async streamPerformance(
    @Param('streamId') streamId: string,
    @Query() query: GroupPerformanceQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.streamPerformanceSummary(
      streamId,
      user.activeSchoolId!,
      query.academicYearId,
      query.termId,
      query.subjectId,
    );
  }

  @Get('subjects/:subjectId/performance')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Get subject performance summary' })
  @ApiParam({ name: 'subjectId', type: String })
  @ApiOkResponse({ description: 'Subject performance summary' })
  async subjectPerformance(
    @Param('subjectId') subjectId: string,
    @Query() query: GroupPerformanceQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.subjectPerformanceSummary(
      subjectId,
      user.activeSchoolId!,
      query.academicYearId,
      query.termId,
      query.classId,
      query.streamId,
    );
  }

  @Get('classes/:classId/period-comparison')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Compare class performance across periods' })
  @ApiParam({ name: 'classId', type: String })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiOkResponse({ description: 'Class period comparison' })
  async classPeriodComparison(
    @Param('classId') classId: string,
    @Query('academicYearId') academicYearId: string,
    @Query() query: GroupPeriodComparisonQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.classPeriodComparison(
      classId,
      user.activeSchoolId!,
      academicYearId,
      query.subjectId,
    );
  }

  @Get('streams/:streamId/period-comparison')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Compare stream performance across periods' })
  @ApiParam({ name: 'streamId', type: String })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiOkResponse({ description: 'Stream period comparison' })
  async streamPeriodComparison(
    @Param('streamId') streamId: string,
    @Query('academicYearId') academicYearId: string,
    @Query() query: GroupPeriodComparisonQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.streamPeriodComparison(
      streamId,
      user.activeSchoolId!,
      academicYearId,
      query.subjectId,
    );
  }

  @Get('subjects/:subjectId/period-comparison')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Compare subject performance across periods' })
  @ApiParam({ name: 'subjectId', type: String })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiOkResponse({ description: 'Subject period comparison' })
  async subjectPeriodComparison(
    @Param('subjectId') subjectId: string,
    @Query('academicYearId') academicYearId: string,
    @Query() query: GroupPeriodComparisonQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.subjectPeriodComparison(
      subjectId,
      user.activeSchoolId!,
      academicYearId,
      query.classId,
    );
  }

  @Get('comparisons/classes')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Compare performance across classes' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiOkResponse({ description: 'Class comparison result' })
  async compareClasses(
    @Query('academicYearId') academicYearId: string,
    @Query() query: ComparisonQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.compareClasses(
      user.activeSchoolId!,
      academicYearId,
      query.academicLevelId,
      query.termId,
      query.subjectId,
    );
  }

  @Get('comparisons/streams')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Compare performance across streams within a class' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiQuery({ name: 'classId', required: true, type: String })
  @ApiOkResponse({ description: 'Stream comparison result' })
  async compareStreams(
    @Query('academicYearId') academicYearId: string,
    @Query('classId') classId: string,
    @Query() query: ComparisonQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.compareStreams(
      user.activeSchoolId!,
      classId,
      academicYearId,
      query.termId,
      query.subjectId,
    );
  }

  @Get('comparisons/subjects')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('analytics.read')
  @ApiOperation({ summary: 'Compare performance across subjects within a class' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiQuery({ name: 'classId', required: true, type: String })
  @ApiOkResponse({ description: 'Subject comparison result' })
  async compareSubjects(
    @Query('academicYearId') academicYearId: string,
    @Query('classId') classId: string,
    @Query() query: ComparisonQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.compareSubjects(
      user.activeSchoolId!,
      classId,
      academicYearId,
      query.termId,
    );
  }
}
