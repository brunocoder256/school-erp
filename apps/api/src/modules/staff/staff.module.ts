import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { DepartmentsController } from './controllers/departments.controller';
import { QualificationsController } from './controllers/qualifications.controller';
import { ResponsibilitiesController } from './controllers/responsibilities.controller';
import { StaffCategoriesController } from './controllers/staff-categories.controller';
import { StaffController } from './controllers/staff.controller';
import { StaffPositionsController } from './controllers/staff-positions.controller';
import { SubjectCapabilitiesController } from './controllers/subject-capabilities.controller';
import { TeacherProfilesController } from './controllers/teacher-profiles.controller';
import { TeachingAssignmentsController } from './controllers/teaching-assignments.controller';
import { DepartmentsService } from './services/departments.service';
import { QualificationsService } from './services/qualifications.service';
import { ResponsibilitiesService } from './services/responsibilities.service';
import { StaffCategoriesService } from './services/staff-categories.service';
import { StaffPositionsService } from './services/staff-positions.service';
import { StaffService } from './services/staff.service';
import { SubjectCapabilitiesService } from './services/subject-capabilities.service';
import { TeacherProfilesService } from './services/teacher-profiles.service';
import { TeachingAssignmentsService } from './services/teaching-assignments.service';

@Module({
  imports: [IdentityModule],
  controllers: [
    StaffController,
    DepartmentsController,
    StaffCategoriesController,
    StaffPositionsController,
    TeacherProfilesController,
    QualificationsController,
    SubjectCapabilitiesController,
    ResponsibilitiesController,
    TeachingAssignmentsController,
  ],
  providers: [
    StaffService,
    DepartmentsService,
    StaffCategoriesService,
    StaffPositionsService,
    TeacherProfilesService,
    QualificationsService,
    SubjectCapabilitiesService,
    ResponsibilitiesService,
    TeachingAssignmentsService,
  ],
  exports: [
    StaffService,
    DepartmentsService,
    StaffCategoriesService,
    StaffPositionsService,
    TeacherProfilesService,
    QualificationsService,
    SubjectCapabilitiesService,
    ResponsibilitiesService,
    TeachingAssignmentsService,
  ],
})
export class StaffModule {}
