import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ClassesController } from './controllers/classes.controller';
import { LevelsController } from './controllers/levels.controller';
import { OrganizationsController } from './controllers/organizations.controller';
import { ProgressionsController } from './controllers/progressions.controller';
import { SectionsController } from './controllers/sections.controller';
import { StreamsController } from './controllers/streams.controller';
import { ClassesService } from './services/classes.service';
import { LevelsService } from './services/levels.service';
import { OrganizationsService } from './services/organizations.service';
import { ProgressionsService } from './services/progressions.service';
import { SectionsService } from './services/sections.service';
import { StreamsService } from './services/streams.service';

@Module({
  imports: [IdentityModule],
  controllers: [
    SectionsController,
    OrganizationsController,
    LevelsController,
    ProgressionsController,
    ClassesController,
    StreamsController,
  ],
  providers: [
    SectionsService,
    OrganizationsService,
    LevelsService,
    ProgressionsService,
    ClassesService,
    StreamsService,
  ],
  exports: [
    SectionsService,
    OrganizationsService,
    LevelsService,
    ProgressionsService,
    ClassesService,
    StreamsService,
  ],
})
export class AcademicStructureModule {}