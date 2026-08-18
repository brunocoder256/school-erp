import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { RolesController } from './controllers/roles.controller';
import { UsersController } from './controllers/users.controller';
import { RolesService } from './services/roles.service';
import { UsersService } from './services/users.service';

@Module({
  imports: [IdentityModule],
  controllers: [UsersController, RolesController],
  providers: [UsersService, RolesService],
  exports: [UsersService, RolesService],
})
export class UsersModule {}
