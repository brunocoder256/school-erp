import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ReportCardsController } from './controllers/report-cards.controller';
import { ReportTemplatesController } from './controllers/report-templates.controller';
import { ReportCardsService } from './services/report-cards.service';
import { ReportTemplatesService } from './services/report-templates.service';

@Module({
  imports: [IdentityModule],
  controllers: [ReportTemplatesController, ReportCardsController],
  providers: [ReportTemplatesService, ReportCardsService],
  exports: [ReportCardsService, ReportTemplatesService],
})
export class AcademicRecordsModule {}
