import {
  Body,
  Controller,
  Delete,
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
import { CreateTermDto } from '../dto/create-term.dto';
import { UpdateTermDto } from '../dto/update-term.dto';
import { TermsService } from '../services/terms.service';

/**
 * Term administration nested under an academic year of the active school.
 *
 * The tenant relationship term → academic year → activeSchoolId is verified by
 * the service on every operation. Client-supplied school IDs are never honored.
 */
@ApiTags('terms')
@ApiBearerAuth()
@Controller('academic-years/:academicYearId/terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Post()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('terms.create')
  @ApiOperation({ summary: 'Create a term within an academic year' })
  @ApiParam({ name: 'academicYearId', type: String })
  @ApiCreatedResponse({ description: 'Created term' })
  @ApiForbiddenResponse({ description: 'Missing terms.create permission' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('academicYearId', ParseUUIDPipe) academicYearId: string,
    @Body() dto: CreateTermDto,
  ) {
    return this.termsService.create(user.activeSchoolId, academicYearId, dto);
  }

  @Get()
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('terms.read')
  @ApiOperation({ summary: 'List terms within an academic year' })
  @ApiParam({ name: 'academicYearId', type: String })
  @ApiOkResponse({ description: 'Terms within the academic year' })
  @ApiForbiddenResponse({ description: 'Missing terms.read permission' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('academicYearId', ParseUUIDPipe) academicYearId: string,
  ) {
    return this.termsService.list(user.activeSchoolId, academicYearId);
  }

  @Get(':termId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('terms.read')
  @ApiOperation({ summary: 'Get a term within an academic year' })
  @ApiParam({ name: 'academicYearId', type: String })
  @ApiParam({ name: 'termId', type: String })
  @ApiOkResponse({ description: 'Term' })
  @ApiNotFoundResponse({
    description: 'Academic year or term does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing terms.read permission' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('academicYearId', ParseUUIDPipe) academicYearId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ) {
    return this.termsService.get(user.activeSchoolId, academicYearId, termId);
  }

  @Patch(':termId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('terms.update')
  @ApiOperation({ summary: 'Update a term within an academic year' })
  @ApiParam({ name: 'academicYearId', type: String })
  @ApiParam({ name: 'termId', type: String })
  @ApiOkResponse({ description: 'Updated term' })
  @ApiNotFoundResponse({
    description: 'Academic year or term does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing terms.update permission' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('academicYearId', ParseUUIDPipe) academicYearId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
    @Body() dto: UpdateTermDto,
  ) {
    return this.termsService.update(
      user.activeSchoolId,
      academicYearId,
      termId,
      dto,
    );
  }

  @Delete(':termId')
  @UseGuards(AuthGuard, PermissionGuard)
  @Permissions('terms.delete')
  @ApiOperation({ summary: 'Delete a term within an academic year' })
  @ApiParam({ name: 'academicYearId', type: String })
  @ApiParam({ name: 'termId', type: String })
  @ApiOkResponse({ description: 'Term deleted' })
  @ApiNotFoundResponse({
    description: 'Academic year or term does not belong to this school',
  })
  @ApiForbiddenResponse({ description: 'Missing terms.delete permission' })
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('academicYearId', ParseUUIDPipe) academicYearId: string,
    @Param('termId', ParseUUIDPipe) termId: string,
  ) {
    return this.termsService.delete(
      user.activeSchoolId,
      academicYearId,
      termId,
    );
  }
}
