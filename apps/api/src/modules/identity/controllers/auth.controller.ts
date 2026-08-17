import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LoginDto } from '../dto/login.dto';
import { SelectSchoolDto } from '../dto/select-school.dto';
import { AuthGuard } from '../guards/auth.guard';
import { IdentityService } from '../services/identity.service';
import type { AuthenticatedUser } from '../types/authenticated-request';
import { AuthLoginResult, AuthMeResult } from '../types/jwt-payload';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly identityService: IdentityService) {}

  /**
   * Brute-force protection for credential authentication only.
   * Limit of 5 attempts per 60 seconds per IP using in-memory storage
   * (no Redis required for the current monolithic deployment).
   */
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiOkResponse({ description: 'Access token and school context' })
  login(@Body() dto: LoginDto): Promise<AuthLoginResult> {
    return this.identityService.login(dto.email, dto.password);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get the authenticated user profile with roles and permissions resolved for the active school',
  })
  @ApiOkResponse({ description: 'Authenticated user summary' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthMeResult> {
    return this.identityService.me(user);
  }

  @Post('select-school')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Select active school when the user has multiple memberships',
  })
  @ApiOkResponse({ description: 'Re-issued access token with school context' })
  selectSchool(
    @CurrentUser('id') userId: string,
    @Body() dto: SelectSchoolDto,
  ): Promise<AuthLoginResult> {
    return this.identityService.selectSchool(userId, dto.schoolId);
  }
}
