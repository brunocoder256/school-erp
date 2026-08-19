import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { EnrollmentCombinationsController } from './controllers/enrollment-combinations.controller';
import { ReportCardsController } from './controllers/report-cards.controller';
import { StudentProgressionsController } from './controllers/student-progressions.controller';
import {
  StudentSubjectsController,
  SubjectEnrollmentsController,
} from './controllers/student-subjects.controller';
import { SubjectAllocationsController } from './controllers/subject-allocations.controller';
import { TeachingGroupsController } from './controllers/teaching-groups.controller';
import { EnrollmentCombinationsService } from './services/enrollment-combinations.service';
import { ReportCardsService } from './services/report-cards.service';
import { StudentProgressionsService } from './services/student-progressions.service';
import { StudentSubjectsService } from './services/student-subjects.service';
import { SubjectAllocationsService } from './services/subject-allocations.service';
import { TeachingGroupsService } from './services/teaching-groups.service';

@Module({
  imports: [IdentityModule],
  controllers: [
    SubjectAllocationsController,
    TeachingGroupsController,
    StudentSubjectsController,
    SubjectEnrollmentsController,
    EnrollmentCombinationsController,
    ReportCardsController,
    StudentProgressionsController,
  ],
  providers: [
    SubjectAllocationsService,
    TeachingGroupsService,
    StudentSubjectsService,
    EnrollmentCombinationsService,
    ReportCardsService,
    StudentProgressionsService,
  ],
  exports: [
    SubjectAllocationsService,
    TeachingGroupsService,
    StudentSubjectsService,
    EnrollmentCombinationsService,
    ReportCardsService,
    StudentProgressionsService,
  ],
})
export class AcademicOperationsModule {}
