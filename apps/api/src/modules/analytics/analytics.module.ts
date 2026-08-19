import { Module } from '@nestjs/common';
import { AssessmentsModule } from '../assessments/assessments.module';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [AssessmentsModule],
  controllers: [AnalyticsController],
  providers: [PrismaService, AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
