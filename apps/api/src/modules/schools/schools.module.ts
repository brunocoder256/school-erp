import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { SchoolsController } from './controllers/schools.controller';
import { SchoolsService } from './services/schools.service';

@Module({
  imports: [IdentityModule],
  controllers: [SchoolsController],
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
