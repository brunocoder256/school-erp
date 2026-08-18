import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { SubjectCategoriesController } from './controllers/subject-categories.controller';
import { SubjectCombinationsController } from './controllers/subject-combinations.controller';
import { SubjectOfferingsController } from './controllers/subject-offerings.controller';
import { SubjectsController } from './controllers/subjects.controller';
import { SubjectCategoriesService } from './services/subject-categories.service';
import { SubjectCombinationsService } from './services/subject-combinations.service';
import { SubjectOfferingsService } from './services/subject-offerings.service';
import { SubjectsService } from './services/subjects.service';

@Module({
  imports: [IdentityModule],
  controllers: [
    SubjectCategoriesController,
    SubjectsController,
    SubjectOfferingsController,
    SubjectCombinationsController,
  ],
  providers: [
    SubjectCategoriesService,
    SubjectsService,
    SubjectOfferingsService,
    SubjectCombinationsService,
  ],
  exports: [
    SubjectCategoriesService,
    SubjectsService,
    SubjectOfferingsService,
    SubjectCombinationsService,
  ],
})
export class SubjectsModule {}