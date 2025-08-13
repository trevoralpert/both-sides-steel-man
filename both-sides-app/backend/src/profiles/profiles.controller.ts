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

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  private readonly logger = new Logger(ProfilesController.name);

  constructor(private readonly profilesService: ProfilesService) {}

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
    
    const profile = await this.profilesService.deactivateProfile(id);
    
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
    @Body(new ValidationPipe({ transform: true })) createProfileDto: Omit<CreateProfileDto, 'user_id'>,
    @User() user: any,
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
    @Body(new ValidationPipe({ transform: true })) updateProfileDto: UpdateProfileDto,
    @User() user: any,
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
    @Param('userId', ParseUUIDPipe) userId: string,
    @User() user: any,
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
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('completed') completed?: string,
    @Query('search') search?: string,
    @User() user: any,
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
}
