import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validate } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { IdentityModule } from './modules/identity/identity.module';
import { SchoolsModule } from './modules/schools/schools.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
