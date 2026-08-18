import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { Permissions } from '../../identity/decorators/permissions.decorator';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PermissionGuard } from '../../identity/guards/permission.guard';
import type { AuthenticatedUser } from '../../identity/types/authenticated-request';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateMembershipDto } from '../dto/update-membership.dto';
import type {
  MembershipResponse,
  UserResponse,
  UserRoleAssignmentResponse,
} from '../dto/user-response.dto';
import { RolesService } from '../services/roles.service';
import { UsersService } from '../services/users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  /**
   * Creates a user account. Membership and role assignment are explicit
   * operations performed on subsequent requests. System roles can never be
   * created through this endpoint.
   */
  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('users.create')
  @ApiOperation({ summary: 'Create a user account' })
  @ApiCreatedResponse({ description: 'Created user' })
  @ApiForbiddenResponse({
    description: 'Missing users.create permission',
  })
  createUser(@Body() dto: CreateUserDto): Promise<UserResponse> {
    return this.usersService.createUser(dto);
  }

  /**
   * Lists members of the authenticated user's active school only.
   */
  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('users.read')
  @ApiOperation({ summary: 'List members of the active school' })
  @ApiOkResponse({ description: 'Members of the active school' })
  listMembers(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listMembers(this.requireSchool(user));
  }

  /**
   * Retrieves one member of the active school. Users from other schools are
   * reported as not found.
   */
  @Get(':userId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('users.read')
  @ApiOperation({ summary: 'Get a member of the active school' })
  @ApiParam({ name: 'userId', type: String })
  @ApiOkResponse({ description: 'School member' })
  @ApiNotFoundResponse({ description: 'User is not a member of this school' })
  getMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.usersService.getMember(this.requireSchool(user), userId);
  }

  /**
   * Adds an existing user to the active school with an ACTIVE membership.
   */
  @Post(':userId/membership')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('memberships.create')
  @ApiOperation({ summary: 'Add a user to the active school' })
  @ApiParam({ name: 'userId', type: String })
  @ApiCreatedResponse({ description: 'Created membership' })
  createMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<MembershipResponse> {
    return this.usersService.createMembership(this.requireSchool(user), userId);
  }

  /**
   * Activates or deactivates a membership within the active school.
   */
  @Patch(':userId/membership')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('memberships.update')
  @ApiOperation({ summary: 'Activate or deactivate a school membership' })
  @ApiParam({ name: 'userId', type: String })
  @ApiOkResponse({ description: 'Updated membership' })
  updateMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMembershipDto,
  ): Promise<MembershipResponse> {
    return this.usersService.updateMembership(
      this.requireSchool(user),
      userId,
      dto.status,
    );
  }

  /**
   * Assigns a SCHOOL-scoped role to a member of the active school.
   */
  @Post(':userId/roles')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('roles.assign')
  @ApiOperation({ summary: 'Assign a school role to a member' })
  @ApiParam({ name: 'userId', type: String })
  @ApiCreatedResponse({ description: 'Created role assignment' })
  assignRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignRoleDto,
  ): Promise<UserRoleAssignmentResponse> {
    return this.rolesService.assignRole(
      this.requireSchool(user),
      userId,
      dto.roleId,
    );
  }

  /**
   * Revokes a SCHOOL-scoped role from a member of the active school.
   */
  @Delete(':userId/roles/:roleId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('roles.revoke')
  @ApiOperation({ summary: 'Revoke a school role from a member' })
  @ApiParam({ name: 'userId', type: String })
  @ApiParam({ name: 'roleId', type: String })
  @ApiOkResponse({ description: 'Role revoked' })
  revokeRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.rolesService.revokeRole(
      this.requireSchool(user),
      userId,
      roleId,
    );
  }

  private requireSchool(user: AuthenticatedUser): string {
    if (!user.activeSchoolId) {
      throw new ForbiddenException(
        'Active school context is required for this operation.',
      );
    }

    return user.activeSchoolId;
  }
}
