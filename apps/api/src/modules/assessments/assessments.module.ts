import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AssessmentSchemesController } from './controllers/assessment-schemes.controller';
import { AssessmentScoresController } from './controllers/assessment-scores.controller';
import { AssessmentsController } from './controllers/assessments.controller';
import { ExaminationsController } from './controllers/examinations.controller';
import { GradingSchemesController } from './controllers/grading-schemes.controller';
import { RankingPoliciesController } from './controllers/ranking-policies.controller';
import { RankingsController } from './controllers/rankings.controller';
import { ResultsController } from './controllers/results.controller';
import { AssessmentSchemesService } from './services/assessment-schemes.service';
import { AssessmentScoresService } from './services/assessment-scores.service';
import { AssessmentsService } from './services/assessments.service';
import { ExaminationsService } from './services/examinations.service';
import { GradingSchemesService } from './services/grading-schemes.service';
import { RankingPoliciesService } from './services/ranking-policies.service';
import { RankingsService } from './services/rankings.service';
import { ResultCalculatorService } from './services/result-calculator.service';
import { ResultsService } from './services/results.service';

@Module({
  imports: [IdentityModule],
  controllers: [
    AssessmentSchemesController,
    GradingSchemesController,
    RankingPoliciesController,
    AssessmentsController,
    AssessmentScoresController,
    ResultsController,
    ExaminationsController,
    RankingsController,
  ],
  providers: [
    AssessmentSchemesService,
    GradingSchemesService,
    RankingPoliciesService,
    AssessmentsService,
    AssessmentScoresService,
    ResultCalculatorService,
    ResultsService,
    ExaminationsService,
    RankingsService,
  ],
  exports: [
    AssessmentSchemesService,
    GradingSchemesService,
    RankingPoliciesService,
    AssessmentsService,
    AssessmentScoresService,
    ResultCalculatorService,
    ResultsService,
    ExaminationsService,
    RankingsService,
  ],
})
export class AssessmentsModule {}