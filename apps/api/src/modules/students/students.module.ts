import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import {
  EnrollmentsController,
  StudentEnrollmentsController,
} from './controllers/enrollments.controller';
import { GuardiansController } from './controllers/guardians.controller';
import { StudentsController } from './controllers/students.controller';
import { EnrollmentsService } from './services/enrollments.service';
import { GuardiansService } from './services/guardians.service';
import { StudentsService } from './services/students.service';

@Module({
  imports: [IdentityModule],
  controllers: [
    StudentsController,
    StudentEnrollmentsController,
    EnrollmentsController,
    GuardiansController,
  ],
  providers: [StudentsService, EnrollmentsService, GuardiansService],
  exports: [StudentsService, EnrollmentsService, GuardiansService],
})
export class StudentsModule {}
