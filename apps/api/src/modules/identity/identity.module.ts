import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { PermissionGuard } from './guards/permission.guard';
import { IdentityService } from './services/identity.service';
import { PasswordService } from './services/password.service';
import { PermissionService } from './services/permission.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn =
          configService.get<string>('JWT_EXPIRES_IN') ?? '1d';

        return {
          secret: configService.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as
              | `${number}d`
              | `${number}h`
              | `${number}m`
              | `${number}s`,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    IdentityService,
    PasswordService,
    PermissionService,
    JwtStrategy,
    AuthGuard,
    PermissionGuard,
  ],
  exports: [
    IdentityService,
    PasswordService,
    PermissionService,
    AuthGuard,
    PermissionGuard,
  ],
})
export class IdentityModule {}
