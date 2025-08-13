import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { AuditConfigService } from '../common/services/audit-config.service';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  private readonly logger = new Logger(ProfilesController.name);

  constructor(
    private readonly profilesService: ProfilesService,
    private readonly auditConfig: AuditConfigService
  ) {}

  /**
   * Create a new profile
   * POST /api/profiles
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProfile(
    @Body(new ValidationPipe({ transform: true })) createProfileDto: CreateProfileDto,
    @User() user: any,
  ) {
    this.logger.log(`Creating profile for user: ${createProfileDto.user_id} by ${user.sub}`);
    
    const profile = await this.profilesService.createProfile(createProfileDto);
    
    return {
      success: true,
      message: 'Profile created successfully',
      data: profile,
    };
  }

  /**
   * Get profile by ID
   * GET /api/profiles/:id
   */
  @Get(':id')
  async getProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: any,
  ) {
    this.logger.log(`Getting profile: ${id} by user ${user.sub}`);
    
    const profile = await this.profilesService.findProfile(id);
    
    return {
      success: true,
      data: profile,
    };
  }

  /**
   * Update profile by ID
   * PUT /api/profiles/:id
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true })) updateProfileDto: UpdateProfileDto,
    @User() user: any,
  ) {
    this.logger.log(`Updating profile: ${id} by user ${user.sub}`);
    
    const profile = await this.profilesService.updateProfile(id, updateProfileDto);
    
    return {
      success: true,
      message: 'Profile updated successfully',
      data: profile,
    };
  }

  /**
   * Soft delete profile (deactivate)
   * DELETE /api/profiles/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deactivateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: any,
  ) {
    this.logger.log(`Deactivating profile: ${id} by user ${user.sub}`);
    
    const profile = await this.profilesService.deactivateProfile(id, user.sub);
    
    return {
      success: true,
      message: 'Profile deactivated successfully',
      data: profile,
    };
  }

  /**
   * Get current user's profile
   * GET /api/profiles/me
   */
  @Get('me/current')
  async getCurrentUserProfile(@User() user: any) {
    this.logger.log(`Getting current user profile for ${user.sub}`);
    
    const profile = await this.profilesService.findProfileByClerkId(user.sub);
    
    return {
      success: true,
      data: profile,
    };
  }

  /**
   * Create profile for current user
   * POST /api/profiles/me
   */
  @Post('me/create')
  @HttpCode(HttpStatus.CREATED)
  async createCurrentUserProfile(
    @User() user: any,
    @Body(new ValidationPipe({ transform: true })) createProfileDto: Omit<CreateProfileDto, 'user_id'>,
  ) {
    this.logger.log(`Creating profile for current user ${user.sub}`);
    
    // Get the user's internal ID from Clerk ID
    const internalUser = await this.profilesService['prisma'].user.findUnique({
      where: { clerk_id: user.sub },
    });
    
    if (!internalUser) {
      return {
        success: false,
        message: 'User not found',
        data: null,
      };
    }
    
    const fullCreateDto: CreateProfileDto = {
      ...createProfileDto,
      user_id: internalUser.id,
    };
    
    const profile = await this.profilesService.createProfile(fullCreateDto);
    
    return {
      success: true,
      message: 'Profile created successfully',
      data: profile,
    };
  }

  /**
   * Update current user's profile
   * PUT /api/profiles/me
   */
  @Put('me/update')
  @HttpCode(HttpStatus.OK)
  async updateCurrentUserProfile(
    @User() user: any,
    @Body(new ValidationPipe({ transform: true })) updateProfileDto: UpdateProfileDto,
  ) {
    this.logger.log(`Updating current user profile for ${user.sub}`);
    
    const profile = await this.profilesService.findProfileByClerkId(user.sub);
    
    if (!profile) {
      return {
        success: false,
        message: 'Profile not found',
        data: null,
      };
    }
    
    const updatedProfile = await this.profilesService.updateProfile(profile.id, updateProfileDto);
    
    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile,
    };
  }

  /**
   * Mark current user's profile as completed
   * PUT /api/profiles/me/complete
   */
  @Put('me/complete')
  @HttpCode(HttpStatus.OK)
  async completeCurrentUserProfile(@User() user: any) {
    this.logger.log(`Completing profile for user ${user.sub}`);
    
    const profile = await this.profilesService.findProfileByClerkId(user.sub);
    
    if (!profile) {
      return {
        success: false,
        message: 'Profile not found',
        data: null,
      };
    }
    
    const completedProfile = await this.profilesService.markProfileCompleted(profile.id);
    
    return {
      success: true,
      message: 'Profile marked as completed',
      data: completedProfile,
    };
  }

  /**
   * Get profile by user ID
   * GET /api/profiles/user/:userId
   */
  @Get('user/:userId')
  async getProfileByUserId(
    @User() user: any,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    this.logger.log(`Getting profile for user: ${userId} by ${user.sub}`);
    
    const profile = await this.profilesService.findProfileByUserId(userId);
    
    return {
      success: true,
      data: profile,
    };
  }

  /**
   * Get all profiles with pagination and filters
   * GET /api/profiles
   */
  @Get()
  async getAllProfiles(
    @User() user: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('completed') completed?: string,
    @Query('search') search?: string,
  ) {
    this.logger.log(`Getting profiles list by ${user.sub}`);
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 100); // Cap at 100
    
    const where: any = {};
    
    if (completed !== undefined) {
      where.is_completed = completed === 'true';
    }
    
    if (search) {
      where.OR = [
        { belief_summary: { contains: search, mode: 'insensitive' } },
        { user: {
          OR: [
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
          ],
        }},
      ];
    }
    
    const result = await this.profilesService.findAllProfiles({
      skip,
      take,
      where,
      orderBy: { updated_at: 'desc' },
    });
    
    return {
      success: true,
      data: result.profiles,
      pagination: {
        page: parseInt(page),
        limit: take,
        total: result.total,
        hasMore: result.hasMore,
      },
    };
  }

  /**
   * Get profile statistics
   * GET /api/profiles/stats/summary
   */
  @Get('stats/summary')
  async getProfileStats(@User() user: any) {
    this.logger.log(`Getting profile statistics by ${user.sub}`);
    
    const stats = await this.profilesService.getProfileStats();
    
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Check if user has completed profile
   * GET /api/profiles/me/completed
   */
  @Get('me/completed')
  async checkProfileCompleted(@User() user: any) {
    this.logger.log(`Checking profile completion for ${user.sub}`);
    
    // Get the user's internal ID from Clerk ID
    const internalUser = await this.profilesService['prisma'].user.findUnique({
      where: { clerk_id: user.sub },
    });
    
    if (!internalUser) {
      return {
        success: false,
        message: 'User not found',
        data: { completed: false },
      };
    }
    
    const isCompleted = await this.profilesService.isProfileCompleted(internalUser.id);
    
    return {
      success: true,
      data: { completed: isCompleted },
    };
  }

  /**
   * Get profile insights
   * GET /api/profiles/:id/insights
   */
  @Get(':id/insights')
  async getProfileInsights(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: any,
  ) {
    this.logger.log(`Getting profile insights for profile: ${id} by user ${user.sub}`);
    
    try {
      const insights = await this.profilesService.generateProfileInsights(id);
      
      return {
        success: true,
        data: insights,
      };
    } catch (error) {
      this.logger.error(`Failed to generate profile insights: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to generate profile insights',
        data: null,
      };
    }
  }

  /**
   * Get current user's profile insights
   * GET /api/profiles/me/insights
   */
  @Get('me/insights')
  async getCurrentUserProfileInsights(@User() user: any) {
    this.logger.log(`Getting profile insights for current user ${user.sub}`);
    
    try {
      const profile = await this.profilesService.findProfileByClerkId(user.sub);
      
      if (!profile) {
        return {
          success: false,
          message: 'Profile not found',
          data: null,
        };
      }
      
      const insights = await this.profilesService.generateProfileInsights(profile.id);
      
      return {
        success: true,
        data: insights,
      };
    } catch (error) {
      this.logger.error(`Failed to generate current user profile insights: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to generate profile insights',
        data: null,
      };
    }
  }

  /**
   * Task 2.2.2.5: Profile comparison endpoints
   */

  /**
   * Compare two profiles
   * POST /api/profiles/compare
   */
  @Post('compare')
  @HttpCode(HttpStatus.OK)
  async compareProfiles(
    @Body() compareDto: { profile1Id: string; profile2Id: string; includeMetadata?: boolean },
    @User() user: any
  ) {
    this.logger.log(`Comparing profiles ${compareDto.profile1Id} and ${compareDto.profile2Id} by user ${user.sub}`);
    
    try {
      const comparison = await this.profilesService.compareProfiles(
        compareDto.profile1Id,
        compareDto.profile2Id,
        { includeMetadata: compareDto.includeMetadata }
      );
      
      return {
        success: true,
        data: comparison,
      };
    } catch (error) {
      this.logger.error(`Failed to compare profiles: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to compare profiles',
        data: null,
      };
    }
  }

  /**
   * Compare profile versions
   * POST /api/profiles/:id/versions/compare
   */
  @Post(':id/versions/compare')
  @HttpCode(HttpStatus.OK)
  async compareProfileVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() versionDto: { version1: number; version2: number },
    @User() user: any
  ) {
    this.logger.log(`Comparing versions ${versionDto.version1} and ${versionDto.version2} for profile ${id} by user ${user.sub}`);
    
    try {
      const comparison = await this.profilesService.compareProfileVersions(
        id,
        versionDto.version1,
        versionDto.version2
      );
      
      return {
        success: true,
        data: comparison,
      };
    } catch (error) {
      this.logger.error(`Failed to compare profile versions: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to compare profile versions',
        data: null,
      };
    }
  }

  /**
   * Get profile modification history
   * GET /api/profiles/:id/history
   */
  @Get(':id/history')
  async getProfileHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: any,
    @Query('limit') limit: string = '50',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    this.logger.log(`Getting profile history for ${id} by user ${user.sub}`);
    
    try {
      const options: any = {
        limit: parseInt(limit),
      };

      if (startDate) {
        options.startDate = new Date(startDate);
      }

      if (endDate) {
        options.endDate = new Date(endDate);
      }

      const history = await this.profilesService.getProfileHistory(id, options);
      
      return {
        success: true,
        data: history,
      };
    } catch (error) {
      this.logger.error(`Failed to get profile history: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to get profile history',
        data: null,
      };
    }
  }

  /**
   * Get current user's profile history
   * GET /api/profiles/me/history
   */
  @Get('me/history')
  async getCurrentUserProfileHistory(
    @User() user: any,
    @Query('limit') limit: string = '50',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    this.logger.log(`Getting current user profile history for ${user.sub}`);
    
    try {
      const profile = await this.profilesService.findProfileByClerkId(user.sub);
      
      if (!profile) {
        return {
          success: false,
          message: 'Profile not found',
          data: null,
        };
      }

      const options: any = {
        limit: parseInt(limit),
      };

      if (startDate) {
        options.startDate = new Date(startDate);
      }

      if (endDate) {
        options.endDate = new Date(endDate);
      }

      const history = await this.profilesService.getProfileHistory(profile.id, options);
      
      return {
        success: true,
        data: history,
      };
    } catch (error) {
      this.logger.error(`Failed to get current user profile history: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to get profile history',
        data: null,
      };
    }
  }

  /**
   * Bulk retrieve profiles
   * POST /api/profiles/bulk
   */
  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async getBulkProfiles(
    @Body() bulkDto: { profileIds: string[] },
    @User() user: any
  ) {
    this.logger.log(`Bulk retrieving ${bulkDto.profileIds.length} profiles by user ${user.sub}`);
    
    try {
      if (!bulkDto.profileIds || !Array.isArray(bulkDto.profileIds)) {
        return {
          success: false,
          message: 'profileIds must be an array',
          data: null,
        };
      }

      if (bulkDto.profileIds.length > 100) {
        return {
          success: false,
          message: 'Maximum 100 profiles can be retrieved at once',
          data: null,
        };
      }

      const profiles = await this.profilesService.findProfiles(bulkDto.profileIds);
      
      return {
        success: true,
        data: profiles,
        message: `Retrieved ${profiles.length} of ${bulkDto.profileIds.length} requested profiles`,
      };
    } catch (error) {
      this.logger.error(`Failed to bulk retrieve profiles: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to retrieve profiles',
        data: null,
      };
    }
  }

  /**
   * Validate profile completeness with role-based requirements
   * GET /api/profiles/:id/completeness
   */
  @Get(':id/completeness')
  @HttpCode(HttpStatus.OK)
  async validateProfileCompleteness(
    @Param('id', ParseUUIDPipe) profileId: string,
    @Query('role') userRole?: string,
    @User() user: any
  ) {
    this.logger.log(`Validating profile completeness for profile ${profileId} by user ${user.sub}`);
    
    try {
      const completeness = await this.profilesService.validateProfileCompleteness(profileId, userRole);
      
      return {
        success: true,
        data: completeness,
        message: completeness.isComplete ? 'Profile is complete' : 'Profile is incomplete',
      };
    } catch (error) {
      this.logger.error(`Failed to validate profile completeness: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to validate profile completeness',
        data: null,
      };
    }
  }

  /**
   * Get completion statistics for multiple profiles
   * POST /api/profiles/bulk/completion-stats
   */
  @Post('bulk/completion-stats')
  @HttpCode(HttpStatus.OK)
  async getProfileCompletionStats(
    @Body() bulkDto: { profileIds: string[] },
    @User() user: any
  ) {
    this.logger.log(`Getting completion stats for ${bulkDto.profileIds.length} profiles by user ${user.sub}`);
    
    try {
      if (!bulkDto.profileIds || !Array.isArray(bulkDto.profileIds)) {
        return {
          success: false,
          message: 'profileIds must be an array',
          data: null,
        };
      }

      if (bulkDto.profileIds.length > 100) {
        return {
          success: false,
          message: 'Maximum 100 profiles can be analyzed at once',
          data: null,
        };
      }

      const stats = await this.profilesService.getProfileCompletionStats(bulkDto.profileIds);
      
      return {
        success: true,
        data: stats,
        message: `Analyzed completion for ${stats.totalCount} profiles`,
      };
    } catch (error) {
      this.logger.error(`Failed to get profile completion stats: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to get completion statistics',
        data: null,
      };
    }
  }

  /**
   * Get profile completion requirements by role
   * GET /api/profiles/requirements/:role
   */
  @Get('requirements/:role')
  @HttpCode(HttpStatus.OK)
  async getProfileRequirements(
    @Param('role') userRole: string,
    @User() user: any
  ) {
    this.logger.log(`Getting profile requirements for role ${userRole} by user ${user.sub}`);
    
    try {
      // Define role-based requirements (same as in service)
      const roleRequirements = {
        'STUDENT': {
          required: ['survey_responses', 'ideology_scores'],
          optional: ['belief_summary'],
          description: 'Students need survey responses and ideology scores to create their debate profile'
        },
        'TEACHER': {
          required: ['survey_responses', 'belief_summary', 'ideology_scores'],
          optional: [],
          description: 'Teachers need complete profiles including belief summaries to moderate debates effectively'
        },
        'ADMIN': {
          required: ['survey_responses', 'ideology_scores'],
          optional: ['belief_summary'],
          description: 'Administrators need survey responses and ideology scores for system oversight'
        }
      };

      const requirements = roleRequirements[userRole.toUpperCase()] || roleRequirements['STUDENT'];
      
      return {
        success: true,
        data: {
          role: userRole.toUpperCase(),
          ...requirements
        },
        message: `Retrieved profile requirements for ${userRole} role`,
      };
    } catch (error) {
      this.logger.error(`Failed to get profile requirements: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to get profile requirements',
        data: null,
      };
    }
  }

  /**
   * Check username availability
   * GET /api/profiles/username/check?username=example&userId=optional
   */
  @Get('username/check')
  @HttpCode(HttpStatus.OK)
  async checkUsernameAvailability(
    @Query('username') username: string,
    @Query('userId') currentUserId?: string,
    @User() user: any
  ) {
    this.logger.log(`Checking username availability for '${username}' by user ${user.sub}`);
    
    try {
      if (!username || username.trim().length === 0) {
        return {
          success: false,
          message: 'Username is required',
          data: null,
        };
      }

      const availability = await this.profilesService.checkUsernameAvailability(username, currentUserId);
      
      return {
        success: true,
        data: availability,
        message: availability.isAvailable ? 'Username is available' : 'Username is not available',
      };
    } catch (error) {
      this.logger.error(`Failed to check username availability: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to check username availability',
        data: null,
      };
    }
  }

  /**
   * Validate cross-field consistency for a profile
   * POST /api/profiles/:id/validate-consistency
   */
  @Post(':id/validate-consistency')
  @HttpCode(HttpStatus.OK)
  async validateCrossFieldConsistency(
    @Param('id', ParseUUIDPipe) profileId: string,
    @Body() profileData: any,
    @User() user: any
  ) {
    this.logger.log(`Validating cross-field consistency for profile ${profileId} by user ${user.sub}`);
    
    try {
      // Get the profile to extract user ID
      const profile = await this.profilesService.findProfile(profileId);
      if (!profile) {
        return {
          success: false,
          message: 'Profile not found',
          data: null,
        };
      }

      const validation = await this.profilesService.validateCrossFieldConsistency(
        profileData, 
        profile.user_id
      );
      
      return {
        success: true,
        data: validation,
        message: validation.isValid ? 
          'Profile data is consistent' : 
          'Profile data has consistency issues',
      };
    } catch (error) {
      this.logger.error(`Failed to validate cross-field consistency: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to validate consistency',
        data: null,
      };
    }
  }

  /**
   * Get comprehensive profile validation report
   * GET /api/profiles/:id/validation-report
   */
  @Get(':id/validation-report')
  @HttpCode(HttpStatus.OK)
  async getProfileValidationReport(
    @Param('id', ParseUUIDPipe) profileId: string,
    @User() user: any
  ) {
    this.logger.log(`Getting validation report for profile ${profileId} by user ${user.sub}`);
    
    try {
      const profile = await this.profilesService.findProfile(profileId);
      if (!profile) {
        return {
          success: false,
          message: 'Profile not found',
          data: null,
        };
      }

      // Get completeness validation
      const completeness = await this.profilesService.validateProfileCompleteness(profileId);
      
      // Get cross-field validation
      const crossField = await this.profilesService.validateCrossFieldConsistency(
        profile, 
        profile.user_id
      );

      // Check username availability if profile has user data
      let usernameCheck = null;
      if (profile.user?.username) {
        usernameCheck = await this.profilesService.checkUsernameAvailability(
          profile.user.username,
          profile.user_id
        );
      }

      const report = {
        profileId,
        completeness: {
          isComplete: completeness.isComplete,
          completionPercentage: completeness.completionPercentage,
          missingFields: completeness.missingFields,
          errors: completeness.errors,
          roleRequirements: completeness.roleRequirements
        },
        crossFieldValidation: {
          isValid: crossField.isValid,
          errors: crossField.errors,
          warnings: crossField.warnings
        },
        usernameValidation: usernameCheck ? {
          isAvailable: usernameCheck.isAvailable,
          suggestions: usernameCheck.suggestions,
          errors: usernameCheck.errors
        } : null,
        overallStatus: {
          isValid: completeness.isComplete && crossField.isValid && 
                  (usernameCheck ? usernameCheck.isAvailable : true),
          issues: [
            ...completeness.errors,
            ...crossField.errors,
            ...(usernameCheck?.errors || [])
          ],
          warnings: crossField.warnings
        }
      };
      
      return {
        success: true,
        data: report,
        message: 'Profile validation report generated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to generate validation report: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to generate validation report',
        data: null,
      };
    }
  }

  // =============================================================================
  // AUDIT LOG ENDPOINTS - Task 2.2.4
  // =============================================================================

  /**
   * Get audit logs for a specific profile
   * GET /api/profiles/:id/audit
   */
  @Get(':id/audit')
  async getProfileAuditLogs(
    @Param('id', ParseUUIDPipe) profileId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('action') action?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @User() user: any,
  ) {
    this.logger.log(`Getting audit logs for profile: ${profileId} by user: ${user.sub}`);
    
    try {
      // Check if user has permission to view audit logs
      const userRole = user.role || 'STUDENT'; // Default role if not provided
      if (!this.auditConfig.canPerformAuditAction(userRole, 'viewAuditLogs')) {
        return {
          success: false,
          message: 'Insufficient permissions to view audit logs',
          data: null,
        };
      }
      const auditService = this.profilesService['auditService'];
      
      const filters = {
        entityType: 'profile',
        entityId: profileId,
        action,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        limit: limit ? parseInt(limit) : 20,
        offset: offset ? parseInt(offset) : 0,
        orderBy: 'created_at' as const,
        orderDirection: 'desc' as const,
      };

      const result = await auditService.queryLogs(filters);
      
      return {
        success: true,
        data: result,
        message: 'Profile audit logs retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get profile audit logs: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to retrieve audit logs',
        data: null,
      };
    }
  }

  /**
   * Get audit logs for all profiles with filtering
   * GET /api/profiles/audit/query
   */
  @Get('audit/query')
  async queryAllAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderDirection') orderDirection?: string,
    @User() user: any,
  ) {
    this.logger.log(`Querying audit logs by user: ${user.sub}`);
    
    try {
      // Check permissions for viewing audit logs
      const userRole = user.role || 'STUDENT';
      if (!this.auditConfig.canPerformAuditAction(userRole, 'viewAuditLogs')) {
        return {
          success: false,
          message: 'Insufficient permissions to query audit logs',
          data: null,
        };
      }
      const auditService = this.profilesService['auditService'];
      
      const filters = {
        entityType: entityType || 'profile',
        action,
        actorId,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        orderBy: (orderBy as any) || 'created_at',
        orderDirection: (orderDirection as any) || 'desc',
      };

      const result = await auditService.queryLogs(filters);
      
      return {
        success: true,
        data: result,
        message: 'Audit logs retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to query audit logs: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to retrieve audit logs',
        data: null,
      };
    }
  }

  /**
   * Get audit history for a specific entity
   * GET /api/profiles/audit/entity/:entityType/:entityId
   */
  @Get('audit/entity/:entityType/:entityId')
  async getEntityAuditHistory(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Query('limit') limit?: string,
    @User() user: any,
  ) {
    this.logger.log(`Getting audit history for ${entityType}:${entityId} by user: ${user.sub}`);
    
    try {
      const auditService = this.profilesService['auditService'];
      
      const history = await auditService.getEntityHistory(
        entityType,
        entityId,
        limit ? parseInt(limit) : 20
      );
      
      return {
        success: true,
        data: history,
        message: 'Entity audit history retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get entity audit history: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to retrieve audit history',
        data: null,
      };
    }
  }

  /**
   * Generate audit report for compliance
   * POST /api/profiles/audit/report
   */
  @Post('audit/report')
  async generateAuditReport(
    @Body() reportRequest: {
      dateFrom: string;
      dateTo: string;
      entityTypes?: string[];
      format?: 'summary' | 'detailed';
    },
    @User() user: any,
  ) {
    this.logger.log(`Generating audit report by user: ${user.sub}`);
    
    try {
      // Check permissions for generating reports
      const userRole = user.role || 'STUDENT';
      if (!this.auditConfig.canPerformAuditAction(userRole, 'generateReports')) {
        return {
          success: false,
          message: 'Insufficient permissions to generate audit reports',
          data: null,
        };
      }
      const auditService = this.profilesService['auditService'];
      
      const report = await auditService.generateAuditReport(
        new Date(reportRequest.dateFrom),
        new Date(reportRequest.dateTo),
        reportRequest.entityTypes,
        reportRequest.format || 'summary'
      );
      
      // Log the report generation as an audit event
      await auditService.logUserAction(
        user.sub,
        'generate_audit_report',
        'audit_report',
        'system',
        {
          dateFrom: reportRequest.dateFrom,
          dateTo: reportRequest.dateTo,
          entityTypes: reportRequest.entityTypes,
          format: reportRequest.format,
          totalActions: report.totalActions,
        },
        { actorId: user.sub, actorType: 'user' }
      );
      
      return {
        success: true,
        data: report,
        message: 'Audit report generated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to generate audit report: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to generate audit report',
        data: null,
      };
    }
  }

  /**
   * Get audit log statistics
   * GET /api/profiles/audit/stats
   */
  @Get('audit/stats')
  async getAuditStats(
    @Query('days') days?: string,
    @User() user: any,
  ) {
    this.logger.log(`Getting audit stats by user: ${user.sub}`);
    
    try {
      const auditService = this.profilesService['auditService'];
      const daysBack = days ? parseInt(days) : 30;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      
      const stats = await auditService.generateAuditReport(
        startDate,
        endDate,
        ['profile', 'user'],
        'summary'
      );
      
      return {
        success: true,
        data: {
          period: {
            days: daysBack,
            startDate,
            endDate,
          },
          ...stats,
        },
        message: 'Audit statistics retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get audit stats: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to retrieve audit statistics',
        data: null,
      };
    }
  }

  /**
   * Clean up old audit logs (Admin only)
   * DELETE /api/profiles/audit/cleanup
   */
  @Delete('audit/cleanup')
  async cleanupAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('actionType') actionType?: string,
    @User() user: any,
  ) {
    this.logger.log(`Cleaning up audit logs by user: ${user.sub}`);
    
    try {
      // Check permissions for deleting audit logs (super admin only)
      const userRole = user.role || 'STUDENT';
      if (!this.auditConfig.canPerformAuditAction(userRole, 'deleteAuditLogs')) {
        return {
          success: false,
          message: 'Insufficient permissions to delete audit logs. Super admin access required.',
          data: null,
        };
      }

      const auditService = this.profilesService['auditService'];
      const result = await auditService.cleanupOldLogs(entityType, actionType);
      
      // Log the cleanup operation
      await auditService.logUserAction(
        user.sub,
        'cleanup_audit_logs',
        'audit_logs',
        'system',
        {
          entityType,
          actionType,
          deletedCount: result.deletedCount,
          retentionDays: result.retentionDays,
        },
        { actorId: user.sub, actorType: 'user' }
      );
      
      return {
        success: true,
        data: result,
        message: `Successfully cleaned up ${result.deletedCount} audit logs`,
      };
    } catch (error) {
      this.logger.error(`Failed to cleanup audit logs: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to cleanup audit logs',
        data: null,
      };
    }
  }

  /**
   * Get audit configuration and privacy settings (Admin only)
   * GET /api/profiles/audit/config
   */
  @Get('audit/config')
  async getAuditConfig(@User() user: any) {
    try {
      // Check permissions for viewing audit configuration
      const userRole = user.role || 'STUDENT';
      if (!this.auditConfig.canPerformAuditAction(userRole, 'viewAuditLogs')) {
        return {
          success: false,
          message: 'Insufficient permissions to view audit configuration',
          data: null,
        };
      }

      const config = {
        retentionPolicies: this.auditConfig.getRetentionPolicySummary(),
        complianceSettings: this.auditConfig.getComplianceSettings(),
        accessControl: this.auditConfig.getConfig().accessControl,
        privacyControls: {
          sensitiveFieldsCount: this.auditConfig.getConfig().sensitiveFields.length,
          excludedFieldsCount: this.auditConfig.getConfig().excludeFields.length,
          maskingRulesCount: Object.keys(this.auditConfig.getConfig().maskingRules).length,
        },
      };
      
      return {
        success: true,
        data: config,
        message: 'Audit configuration retrieved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to get audit config: ${error.message}`, error.stack);
      return {
        success: false,
        message: error.message || 'Failed to retrieve audit configuration',
        data: null,
      };
    }
  }
}
