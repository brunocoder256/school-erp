import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AcademicYearsController } from './controllers/academic-years.controller';
import { TermsController } from './controllers/terms.controller';
import { AcademicYearsService } from './services/academic-years.service';
import { TermsService } from './services/terms.service';

@Module({
  imports: [IdentityModule],
  controllers: [AcademicYearsController, TermsController],
  providers: [AcademicYearsService, TermsService],
  exports: [AcademicYearsService, TermsService],
})
export class AcademicYearsModule {}
