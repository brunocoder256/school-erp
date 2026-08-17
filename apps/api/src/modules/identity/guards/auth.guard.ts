import { Injectable } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

/**
 * Requires a valid Bearer JWT and attaches AuthenticatedUser to the request.
 * Not registered globally — apply with @UseGuards(AuthGuard) on protected routes.
 */
@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {}
