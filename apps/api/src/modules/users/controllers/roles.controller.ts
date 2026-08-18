import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../../identity/decorators/permissions.decorator';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PermissionGuard } from '../../identity/guards/permission.guard';
import type { AssignableRoleResponse } from '../dto/user-response.dto';
import { RolesService } from '../services/roles.service';

/**
 * Exposes the assignable role catalog. SYSTEM roles such as SUPER_ADMIN are
 * never assignable through school administration and are excluded here.
 */
@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('roles.read')
  @ApiOperation({ summary: 'List assignable school roles' })
  @ApiOkResponse({ description: 'Assignable school roles' })
  listAssignableRoles(): Promise<AssignableRoleResponse[]> {
    return this.rolesService.listAssignableRoles();
  }
}
