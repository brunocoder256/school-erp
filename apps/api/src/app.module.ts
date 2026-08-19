import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validate } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { AcademicStructureModule } from './modules/academic-structure/academic-structure.module';
import { AcademicYearsModule } from './modules/academic-years/academic-years.module';
import { AcademicOperationsModule } from './modules/academic-operations/academic-operations.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { IdentityModule } from './modules/identity/identity.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { StaffModule } from './modules/staff/staff.module';
import { StudentsModule } from './modules/students/students.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1_000 }]),
    PrismaModule,
    IdentityModule,
    SchoolsModule,
    UsersModule,
    AcademicYearsModule,
    StudentsModule,
    AcademicStructureModule,
    SubjectsModule,
    StaffModule,
    AcademicOperationsModule,
    AssessmentsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
