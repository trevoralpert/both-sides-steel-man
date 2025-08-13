import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Profile, Prisma } from '@prisma/client';
import { ProfileValidationUtil } from './validators/profile-validation.util';
import { ProfileCacheService } from './services/profile-cache.service';

// Types for Task 2.2.2 enhancements
export interface ProfileProjection {
  basic?: boolean;
  survey?: boolean;
  ideology?: boolean;
  summary?: boolean;
  plasticity?: boolean;
  user?: boolean;
}

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private prisma: PrismaService,
    private profileCache: ProfileCacheService
  ) {}

  /**
   * Create a new profile for a user
   */
  async createProfile(createProfileDto: CreateProfileDto): Promise<Profile> {
    try {
      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: createProfileDto.user_id },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${createProfileDto.user_id} not found`);
      }

      // Check if profile already exists for this user
      const existingProfile = await this.findProfileByUserId(createProfileDto.user_id);
      if (existingProfile) {
        throw new ConflictException('Profile already exists for this user');
      }

      // Apply business logic and sanitization
      const processedData = await this.processProfileData(createProfileDto);

      const profileData: Prisma.ProfileCreateInput = {
        user: { connect: { id: createProfileDto.user_id } },
        is_completed: processedData.is_completed,
        completion_date: processedData.completion_date,
        survey_responses: processedData.survey_responses,
        belief_summary: processedData.belief_summary,
        ideology_scores: processedData.ideology_scores,
        opinion_plasticity: processedData.opinion_plasticity,
        profile_version: processedData.profile_version,
        last_updated: new Date(),
      };

      const profile = await this.prisma.profile.create({
        data: profileData,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              username: true,
              avatar_url: true,
              role: true,
            },
          },
        },
      });

      this.logger.log(`Created profile with ID: ${profile.id} for user: ${createProfileDto.user_id}`);
      return profile;
    } catch (error) {
      this.logger.error(`Failed to create profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update an existing profile with enhanced validation and audit logging
   */
  async updateProfile(
    profileId: string, 
    updateProfileDto: UpdateProfileDto, 
    userId?: string,
    options?: { skipPermissionCheck?: boolean }
  ): Promise<Profile> {
    try {
      // Check if profile exists
      const existingProfile = await this.findProfile(profileId);
      if (!existingProfile) {
        throw new NotFoundException(`Profile with ID ${profileId} not found`);
      }

      // Validate field-level permissions
      if (!options?.skipPermissionCheck) {
        await this.validateUpdatePermissions(existingProfile, updateProfileDto, userId);
      }

      // Create profile history record before update
      await this.createProfileHistoryRecord(existingProfile, 'update');

      // Apply business logic and sanitization
      const processedData = await this.processProfileData(updateProfileDto, existingProfile);

      const updateData: Prisma.ProfileUpdateInput = {
        is_completed: processedData.is_completed,
        completion_date: processedData.completion_date,
        survey_responses: processedData.survey_responses,
        belief_summary: processedData.belief_summary,
        ideology_scores: processedData.ideology_scores,
        opinion_plasticity: processedData.opinion_plasticity,
        profile_version: processedData.profile_version,
        last_updated: new Date(),
      };

      // Remove undefined values to avoid overwriting with null
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      // Validate partial update logic
      this.validatePartialUpdate(existingProfile, updateData);

      const profile = await this.prisma.profile.update({
        where: { id: profileId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              username: true,
              avatar_url: true,
              role: true,
            },
          },
        },
      });

      // Log the update with audit trail
      await this.logProfileUpdate(existingProfile, profile, userId);

      // Invalidate cache after update
      await this.profileCache.invalidateProfile(profile.id, profile.user_id);

      this.logger.log(`Updated profile with ID: ${profile.id}`);
      return profile;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Profile with ID ${profileId} not found`);
      }
      this.logger.error(`Failed to update profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find profile by ID with caching and optional projection
   */
  async findProfile(
    profileId: string, 
    options?: {
      useCache?: boolean;
      projection?: ProfileProjection;
      includeRelationships?: boolean;
    }
  ): Promise<Profile | null> {
    const { useCache = true, projection, includeRelationships = true } = options || {};

    // Try cache first if enabled
    if (useCache) {
      const cached = await this.profileCache.getProfile(profileId);
      if (cached) {
        return this.applyProjection(cached, projection);
      }
    }

    // Build query with proper includes based on options
    const include = this.buildIncludeQuery(includeRelationships);
    
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include,
    });

    if (profile && useCache) {
      await this.profileCache.setProfile(profile);
    }

    return profile ? this.applyProjection(profile, projection) : null;
  }

  /**
   * Find profile by user ID with caching support
   */
  async findProfileByUserId(
    userId: string, 
    options?: {
      useCache?: boolean;
      projection?: ProfileProjection;
      includeRelationships?: boolean;
    }
  ): Promise<Profile | null> {
    const { useCache = true, projection, includeRelationships = true } = options || {};

    // Try cache first if enabled
    if (useCache) {
      const cached = await this.profileCache.getProfileByUserId(userId);
      if (cached) {
        return this.applyProjection(cached, projection);
      }
    }

    // Build query with proper includes based on options
    const include = this.buildIncludeQuery(includeRelationships);
    
    const profile = await this.prisma.profile.findUnique({
      where: { user_id: userId },
      include,
    });

    if (profile && useCache) {
      await this.profileCache.setProfile(profile);
    }

    return profile ? this.applyProjection(profile, projection) : null;
  }

  /**
   * Find profile by Clerk ID (convenience method)
   */
  async findProfileByClerkId(clerkId: string): Promise<Profile | null> {
    const user = await this.prisma.user.findUnique({
      where: { clerk_id: clerkId },
      include: {
        profile: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                username: true,
                avatar_url: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return user?.profile || null;
  }

  /**
   * Deactivate profile (soft delete - marks as not completed and clears sensitive data)
   */
  async deactivateProfile(profileId: string): Promise<Profile> {
    try {
      const profile = await this.prisma.profile.update({
        where: { id: profileId },
                data: { 
          is_completed: false,
          survey_responses: Prisma.DbNull,
          belief_summary: null,
          ideology_scores: Prisma.DbNull,
          opinion_plasticity: 0.5, // Reset to default
          last_updated: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              username: true,
              avatar_url: true,
              role: true,
            },
          },
        },
      });

      this.logger.log(`Deactivated profile with ID: ${profile.id}`);
      return profile;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Profile with ID ${profileId} not found`);
      }
      this.logger.error(`Failed to deactivate profile: ${error.message}`, error.stack);
      throw error;
    }
  }



  /**
   * Check if profile is completed
   */
  async isProfileCompleted(userId: string): Promise<boolean> {
    const profile = await this.findProfileByUserId(userId);
    return profile?.is_completed || false;
  }

  /**
   * Update profile completion status
   */
  async markProfileCompleted(profileId: string): Promise<Profile> {
    return this.updateProfile(profileId, {
      is_completed: true,
      completion_date: new Date().toISOString(),
    });
  }



  /**
   * Process and sanitize profile data before saving
   */
  private async processProfileData(
    inputData: CreateProfileDto | UpdateProfileDto, 
    existingProfile?: Profile | null
  ): Promise<any> {
    const processedData: any = {};

    // Handle belief summary sanitization
    if (inputData.belief_summary) {
      processedData.belief_summary = ProfileValidationUtil.sanitizeText(inputData.belief_summary);
    }

    // Process survey responses
    if (inputData.survey_responses) {
      processedData.survey_responses = this.processSurveyResponses(inputData.survey_responses);
    }

    // Process ideology scores
    if (inputData.ideology_scores) {
      processedData.ideology_scores = this.processIdeologyScores(inputData.ideology_scores);
    }

    // Set opinion plasticity with smart defaults
    if (inputData.opinion_plasticity !== undefined) {
      processedData.opinion_plasticity = inputData.opinion_plasticity;
    } else if (!existingProfile) {
      // For new profiles, calculate based on survey responses if available
      processedData.opinion_plasticity = this.calculateOpinionPlasticity(inputData.survey_responses) || 0.5;
    }

    // Handle profile version increment
    if (existingProfile) {
      processedData.profile_version = (existingProfile.profile_version || 1) + 1;
    } else {
      processedData.profile_version = inputData.profile_version || 1;
    }

    // Run cross-field validation for data consistency
    const mergedData = { ...existingProfile, ...processedData };
    if (inputData.user_id || existingProfile?.user_id) {
      const userId = inputData.user_id || existingProfile.user_id;
      const crossFieldValidation = await this.validateCrossFieldConsistency(mergedData, userId);
      
      if (!crossFieldValidation.isValid) {
        this.logger.warn(`Cross-field validation warnings for profile: ${crossFieldValidation.errors.join(', ')}`);
        // Log warnings but don't block the operation
      }
      
      if (crossFieldValidation.warnings.length > 0) {
        this.logger.warn(`Profile consistency warnings: ${crossFieldValidation.warnings.join(', ')}`);
      }
    }

    // Auto-detect completion status with role-based validation
    const userRole = existingProfile?.user?.role;
    const shouldAutoComplete = await this.shouldAutoCompleteProfile(processedData, existingProfile, userRole);
    if (shouldAutoComplete && inputData.is_completed !== false) {
      processedData.is_completed = true;
      processedData.completion_date = inputData.completion_date ? new Date(inputData.completion_date) : new Date();
    } else {
      processedData.is_completed = inputData.is_completed;
      processedData.completion_date = inputData.completion_date ? new Date(inputData.completion_date) : undefined;
    }

    // Copy other fields
    Object.keys(inputData).forEach(key => {
      if (!processedData.hasOwnProperty(key) && inputData[key] !== undefined) {
        processedData[key] = inputData[key];
      }
    });

    return processedData;
  }

  /**
   * Process and normalize survey responses
   */
  private processSurveyResponses(responses: any): any {
    if (!responses) return null;

    const processed = { ...responses };

    // Sanitize question text
    if (processed.questions && Array.isArray(processed.questions)) {
      processed.questions = processed.questions.map(q => 
        typeof q === 'string' ? ProfileValidationUtil.sanitizeText(q) : q
      );
    }

    // Ensure answers are clean
    if (processed.answers && Array.isArray(processed.answers)) {
      processed.answers = processed.answers.map(answer => {
        if (typeof answer === 'string') {
          return ProfileValidationUtil.sanitizeText(answer);
        }
        return answer;
      });
    }

    // Add metadata
    processed.processed_at = new Date().toISOString();
    processed.question_count = processed.questions?.length || 0;

    return processed;
  }

  /**
   * Process and normalize ideology scores
   */
  private processIdeologyScores(scores: any): any {
    if (!scores) return null;

    const processed = {};
    const validDimensions = ['conservative', 'liberal', 'libertarian', 'authoritarian', 'progressive', 'traditional'];

    // Normalize score keys to lowercase and validate ranges
    Object.keys(scores).forEach(key => {
      const normalizedKey = key.toLowerCase();
      if (validDimensions.includes(normalizedKey)) {
        const value = parseFloat(scores[key]);
        if (!isNaN(value) && value >= 0 && value <= 1) {
          processed[normalizedKey] = Math.round(value * 1000) / 1000; // Round to 3 decimal places
        }
      }
    });

    // Add metadata
    processed['generated_at'] = new Date().toISOString();
    processed['score_count'] = Object.keys(processed).length - 1; // Exclude metadata

    return processed;
  }

  /**
   * Calculate opinion plasticity based on survey responses
   */
  private calculateOpinionPlasticity(surveyResponses: any): number | null {
    if (!surveyResponses?.answers) return null;

    const answers = surveyResponses.answers;
    let flexibilityScore = 0.5; // Default neutral

    // Look for patterns indicating flexibility or rigidity
    let uncertainResponses = 0;
    let absoluteResponses = 0;

    answers.forEach(answer => {
      if (typeof answer === 'string') {
        const lowerAnswer = answer.toLowerCase();
        
        // Indicators of flexibility
        if (lowerAnswer.includes('maybe') || lowerAnswer.includes('sometimes') || 
            lowerAnswer.includes('depends') || lowerAnswer.includes('unsure') ||
            lowerAnswer.includes('not sure')) {
          uncertainResponses++;
        }
        
        // Indicators of rigidity
        if (lowerAnswer.includes('never') || lowerAnswer.includes('always') || 
            lowerAnswer.includes('definitely') || lowerAnswer.includes('absolutely')) {
          absoluteResponses++;
        }
      }
    });

    const totalResponses = answers.length;
    const uncertaintyRatio = uncertainResponses / totalResponses;
    const absoluteRatio = absoluteResponses / totalResponses;

    // Calculate final score (higher = more flexible)
    flexibilityScore = 0.5 + (uncertaintyRatio * 0.3) - (absoluteRatio * 0.3);

    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, flexibilityScore));
  }

  /**
   * Enhanced profile completeness validation with role-based requirements
   */
  async validateProfileCompleteness(profileId: string, userRole?: string): Promise<{
    isComplete: boolean;
    completionPercentage: number;
    missingFields: string[];
    errors: string[];
    roleRequirements: string[];
  }> {
    const profile = await this.findProfile(profileId);
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Get user role if not provided
    if (!userRole && profile.user) {
      userRole = profile.user.role;
    }

    const completenessResult = ProfileValidationUtil.validateProfileCompleteness(profile, userRole);
    
    // Get role requirements for informational purposes
    const roleRequirements = this.getRoleRequirements(userRole);

    return {
      ...completenessResult,
      roleRequirements
    };
  }

  /**
   * Get completion percentage for multiple profiles
   */
  async getProfileCompletionStats(profileIds: string[]): Promise<{
    profiles: Array<{
      profileId: string;
      completionPercentage: number;
      isComplete: boolean;
    }>;
    averageCompletion: number;
    completeCount: number;
    totalCount: number;
  }> {
    const results = [];
    
    for (const profileId of profileIds) {
      try {
        const completeness = await this.validateProfileCompleteness(profileId);
        results.push({
          profileId,
          completionPercentage: completeness.completionPercentage,
          isComplete: completeness.isComplete
        });
      } catch (error) {
        // Skip profiles that can't be found
        continue;
      }
    }

    const averageCompletion = results.reduce((sum, r) => sum + r.completionPercentage, 0) / results.length;
    const completeCount = results.filter(r => r.isComplete).length;

    return {
      profiles: results,
      averageCompletion: averageCompletion || 0,
      completeCount,
      totalCount: results.length
    };
  }

  /**
   * Determine if profile should be automatically marked as complete
   */
  private async shouldAutoCompleteProfile(inputData: any, existingProfile?: Profile | null, userRole?: string): Promise<boolean> {
    // Merge existing data with new data for completeness check
    const combinedData = {
      ...existingProfile,
      ...inputData,
    };

    const completenessResult = ProfileValidationUtil.validateProfileCompleteness(combinedData, userRole);
    return completenessResult.isComplete;
  }

  /**
   * Get role-based requirements for profile completion
   */
  private getRoleRequirements(userRole?: string): string[] {
    const roleRequirements = {
      'STUDENT': ['survey_responses', 'ideology_scores'],
      'TEACHER': ['survey_responses', 'belief_summary', 'ideology_scores'],
      'ADMIN': ['survey_responses', 'ideology_scores']
    };

    return roleRequirements[userRole || 'STUDENT'] || roleRequirements['STUDENT'];
  }

  /**
   * Check username availability across the system
   */
  async checkUsernameAvailability(username: string, currentUserId?: string): Promise<{
    isAvailable: boolean;
    suggestions?: string[];
    errors?: string[];
  }> {
    // First, validate the username format
    const validation = ProfileValidationUtil.validateUsername(username);
    if (!validation.isValid) {
      return {
        isAvailable: false,
        errors: validation.errors
      };
    }

    // Check if username is already taken in the database
    const existingUser = await this.prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: 'insensitive' // Case insensitive check
        },
        NOT: currentUserId ? { id: currentUserId } : undefined
      }
    });

    if (existingUser) {
      // Generate suggestions for available usernames
      const suggestions = await this.generateUsernameSuggestions(username);
      return {
        isAvailable: false,
        suggestions,
        errors: ['Username is already taken']
      };
    }

    return {
      isAvailable: true
    };
  }

  /**
   * Generate username suggestions when the preferred username is taken
   */
  private async generateUsernameSuggestions(baseUsername: string): Promise<string[]> {
    const suggestions: string[] = [];
    const baseClean = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Try different variations
    const variations = [
      `${baseClean}${Math.floor(Math.random() * 100)}`,
      `${baseClean}${Math.floor(Math.random() * 1000)}`,
      `${baseClean}_user`,
      `${baseClean}_${new Date().getFullYear()}`,
      `the_${baseClean}`,
      `${baseClean}_official`
    ];

    // Check each variation for availability
    for (const variation of variations) {
      if (suggestions.length >= 3) break; // Limit to 3 suggestions
      
      const existing = await this.prisma.user.findFirst({
        where: {
          username: {
            equals: variation,
            mode: 'insensitive'
          }
        }
      });

      if (!existing && variation.length >= 3 && variation.length <= 50) {
        suggestions.push(variation);
      }
    }

    return suggestions;
  }

  /**
   * Validate cross-field consistency for profile and user data
   */
  async validateCrossFieldConsistency(profileData: any, userId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get user data with organization information
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrollments: {
          include: {
            class: {
              include: {
                organization: true
              }
            }
          },
          take: 1 // Just need one to get organization info
        }
      }
    });

    if (!user) {
      errors.push('User not found');
      return { isValid: false, errors, warnings };
    }

    // Get organization domain if user belongs to an organization
    let organizationDomain: string | undefined;
    if (user.enrollments && user.enrollments.length > 0) {
      const org = user.enrollments[0].class.organization;
      // Extract domain from organization email or slug
      if (org.billing_email) {
        organizationDomain = org.billing_email.split('@')[1];
      }
    }

    // Validate email domain consistency
    if (user.email && organizationDomain) {
      const userDomain = user.email.split('@')[1];
      if (userDomain !== organizationDomain) {
        warnings.push(`User email domain (${userDomain}) does not match organization domain (${organizationDomain})`);
      }
    }

    // Use the existing cross-field validation utility
    const crossFieldResult = ProfileValidationUtil.validateCrossFieldConsistency(
      profileData,
      { ...user, organization: organizationDomain ? { domain: organizationDomain } : undefined }
    );

    errors.push(...crossFieldResult.errors);

    // Additional consistency checks specific to the database context
    if (profileData.ideology_scores && profileData.survey_responses) {
      const ideologyConsistency = await this.validateIdeologyConsistency(
        profileData.ideology_scores,
        profileData.survey_responses
      );
      if (!ideologyConsistency.isConsistent) {
        warnings.push(...ideologyConsistency.warnings);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate consistency between ideology scores and survey responses
   */
  private async validateIdeologyConsistency(ideologyScores: any, surveyResponses: any): Promise<{
    isConsistent: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    // This is a placeholder for more sophisticated analysis
    // In a real implementation, this would analyze survey responses and compare
    // them with ideology scores using NLP or predefined question mappings
    
    if (!ideologyScores || !surveyResponses) {
      return { isConsistent: true, warnings: [] };
    }

    // Basic consistency check: if all ideology scores are identical (0 or 1),
    // it might indicate incomplete or inconsistent data
    const scores = Object.values(ideologyScores).filter(v => typeof v === 'number') as number[];
    if (scores.length > 0) {
      const allSame = scores.every(score => score === scores[0]);
      if (allSame && (scores[0] === 0 || scores[0] === 1)) {
        warnings.push('Ideology scores show no variation, which may indicate incomplete assessment');
      }
    }

    return {
      isConsistent: warnings.length === 0,
      warnings
    };
  }

  /**
   * Generate profile insights based on current data
   */
  async generateProfileInsights(profileId: string): Promise<any> {
    const profile = await this.findProfile(profileId);
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${profileId} not found`);
    }

    const insights: {
      completion_percentage: number;
      missing_fields: string[];
      ideology_summary: string | null;
      plasticity_interpretation: string | null;
      recommendations: string[];
    } = {
      completion_percentage: 0,
      missing_fields: [],
      ideology_summary: null,
      plasticity_interpretation: null,
      recommendations: [],
    };

    // Calculate completion percentage
    const requiredFields = ['survey_responses', 'belief_summary', 'ideology_scores'];
    const completedFields = requiredFields.filter(field => profile[field]);
    insights.completion_percentage = (completedFields.length / requiredFields.length) * 100;
    insights.missing_fields = requiredFields.filter(field => !profile[field]);

    // Interpret ideology scores
    if (profile.ideology_scores) {
      insights.ideology_summary = this.interpretIdeologyScores(profile.ideology_scores);
    }

    // Interpret opinion plasticity
    if (profile.opinion_plasticity !== null) {
      insights.plasticity_interpretation = this.interpretOpinionPlasticity(profile.opinion_plasticity);
    }

    // Generate recommendations
    insights.recommendations = this.generateRecommendations(profile);

    return insights;
  }

  private interpretIdeologyScores(scores: any): string {
    if (!scores) return 'No ideology data available';

    const scoreEntries = Object.entries(scores)
      .filter(([key]) => key !== 'generated_at' && key !== 'score_count')
      .map(([key, value]) => [key, parseFloat(value as string)])
      .sort((a, b) => (b[1] as number) - (a[1] as number));

    const topScore = scoreEntries[0];
    if (topScore && (topScore[1] as number) > 0.6) {
      return `Primarily ${topScore[0]} (${Math.round((topScore[1] as number) * 100)}%)`;
    } else {
      return 'Mixed ideological profile with no strong dominant tendency';
    }
  }

  private interpretOpinionPlasticity(plasticity: number): string {
    if (plasticity < 0.3) {
      return 'Highly rigid - tends to maintain fixed opinions';
    } else if (plasticity < 0.5) {
      return 'Somewhat rigid - generally maintains existing views';
    } else if (plasticity < 0.7) {
      return 'Moderately flexible - open to different perspectives';
    } else {
      return 'Highly flexible - readily considers alternative viewpoints';
    }
  }

  /**
   * Task 2.2.2.2: Profile retrieval optimization methods
   */

  /**
   * Bulk retrieve profiles with caching
   */
  async findProfiles(profileIds: string[]): Promise<Profile[]> {
    // Try to get from cache first
    const cached = await this.profileCache.getProfiles(profileIds);
    const foundProfiles: Profile[] = [];
    const missingIds: string[] = [];

    profileIds.forEach(id => {
      if (cached[id]) {
        foundProfiles.push(cached[id]);
      } else {
        missingIds.push(id);
      }
    });

    // Fetch missing profiles from database
    if (missingIds.length > 0) {
      const dbProfiles = await this.prisma.profile.findMany({
        where: { id: { in: missingIds } },
        include: this.buildIncludeQuery(true),
      });

      // Cache the newly fetched profiles
      if (dbProfiles.length > 0) {
        await this.profileCache.setProfiles(dbProfiles);
      }

      foundProfiles.push(...dbProfiles);
    }

    return foundProfiles;
  }

  /**
   * Get profile statistics with caching
   */
  async getProfileStats() {
    // Try cache first
    const cached = await this.profileCache.getProfileStats();
    if (cached) {
      return cached;
    }

    // Calculate fresh stats
    const [total, completed, pending] = await Promise.all([
      this.prisma.profile.count(),
      this.prisma.profile.count({ where: { is_completed: true } }),
      this.prisma.profile.count({ where: { is_completed: false } }),
    ]);

    const stats = {
      total,
      completed,
      pending,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      lastUpdated: new Date(),
    };

    // Cache the stats
    await this.profileCache.setProfileStats(stats);

    return stats;
  }

  /**
   * Enhanced findAllProfiles with caching and better search
   */
  async findAllProfiles(options: {
    skip?: number;
    take?: number;
    where?: Prisma.ProfileWhereInput;
    orderBy?: Prisma.ProfileOrderByWithRelationInput;
    search?: string;
    role?: string;
    useCache?: boolean;
  }) {
    const { skip = 0, take = 50, where, orderBy, search, role, useCache = true } = options;

    // Generate cache key for this search
    const searchKey = this.profileCache.generateSearchKey({
      page: Math.floor(skip / take) + 1,
      limit: take,
      search,
      role,
      completed: where?.is_completed as boolean,
    });

    // Try cache first
    if (useCache) {
      const cached = await this.profileCache.getSearchResults(searchKey);
      if (cached) {
        return cached;
      }
    }

    // Build enhanced where clause
    const enhancedWhere = this.buildEnhancedWhereClause(where, search, role);

    const [profiles, total] = await Promise.all([
      this.prisma.profile.findMany({
        skip,
        take,
        where: enhancedWhere,
        orderBy: orderBy || { updated_at: 'desc' },
        include: this.buildIncludeQuery(true),
      }),
      this.prisma.profile.count({ where: enhancedWhere }),
    ]);

    const result = {
      profiles,
      total,
      hasMore: skip + take < total,
      currentPage: Math.floor(skip / take) + 1,
      totalPages: Math.ceil(total / take),
    };

    // Cache the results
    if (useCache) {
      await this.profileCache.setSearchResults(searchKey, result);
    }

    return result;
  }

  /**
   * Helper method to build include query based on relationship needs
   */
  private buildIncludeQuery(includeRelationships: boolean): any {
    if (!includeRelationships) {
      return undefined;
    }

    return {
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          username: true,
          avatar_url: true,
          role: true,
          enrollments: {
            select: {
              id: true,
              enrollment_status: true,
              enrolled_at: true,
              class: {
                select: {
                  id: true,
                  name: true,
                  subject: true,
                  grade_level: true,
                },
              },
            },
          },
          created_classes: {
            select: {
              id: true,
              name: true,
              subject: true,
              grade_level: true,
              max_students: true,
              is_active: true,
            },
          },
        },
      },
    };
  }

  /**
   * Helper method to build enhanced where clause for searches
   */
  private buildEnhancedWhereClause(
    baseWhere?: Prisma.ProfileWhereInput,
    search?: string,
    role?: string
  ): Prisma.ProfileWhereInput {
    const where: Prisma.ProfileWhereInput = { ...baseWhere };

    // Add search conditions
    if (search) {
      where.OR = [
        { belief_summary: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { first_name: { contains: search, mode: 'insensitive' } },
              { last_name: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Add role filter
    if (role) {
      where.user = {
        ...where.user,
        role: role as any,
      };
    }

    return where;
  }

  /**
   * Apply projection to limit returned fields
   */
  private applyProjection(profile: any, projection?: ProfileProjection): any {
    if (!projection) {
      return profile;
    }

    const result: any = {};

    if (projection.basic) {
      result.id = profile.id;
      result.user_id = profile.user_id;
      result.is_completed = profile.is_completed;
      result.completion_date = profile.completion_date;
      result.last_updated = profile.last_updated;
    }

    if (projection.survey && profile.survey_responses) {
      result.survey_responses = profile.survey_responses;
    }

    if (projection.ideology && profile.ideology_scores) {
      result.ideology_scores = profile.ideology_scores;
    }

    if (projection.summary && profile.belief_summary) {
      result.belief_summary = profile.belief_summary;
    }

    if (projection.plasticity !== undefined) {
      result.opinion_plasticity = profile.opinion_plasticity;
    }

    if (projection.user && profile.user) {
      result.user = profile.user;
    }

    return result;
  }

  private generateRecommendations(profile: Profile): string[] {
    const recommendations: string[] = [];

    if (!profile.survey_responses) {
      recommendations.push('Complete the initial belief survey to enable matching');
    }

    if (!profile.belief_summary) {
      recommendations.push('Add a personal belief summary for better debate matching');
    }

    if (!profile.ideology_scores) {
      recommendations.push('Generate ideology analysis from survey responses');
    }

    if (profile.opinion_plasticity && profile.opinion_plasticity < 0.3) {
      recommendations.push('Consider engaging with diverse perspectives to broaden viewpoints');
    }

    if (profile.profile_version === 1) {
      recommendations.push('Update your profile periodically to reflect evolving beliefs');
    }

    return recommendations;
  }

  /**
   * Enhanced validation methods for Task 2.2.2.1
   */

  /**
   * Validate field-level permissions for profile updates
   */
  private async validateUpdatePermissions(
    existingProfile: Profile, 
    updateDto: UpdateProfileDto, 
    userId?: string
  ): Promise<void> {
    // Check if user is authorized to update this profile
    if (userId && existingProfile.user_id !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // Only profile owner or admin can update profiles  
      if (!user || user.role !== 'ADMIN') {
        throw new BadRequestException('Insufficient permissions to update this profile');
      }
    }

    // Validate sensitive field updates
    if (updateDto.ideology_scores && existingProfile.ideology_scores) {
      // Prevent ideology score manipulation without proper survey data
      if (!updateDto.survey_responses && !existingProfile.survey_responses) {
        throw new BadRequestException('Ideology scores can only be updated with valid survey responses');
      }
    }

    // Prevent profile version rollbacks
    if (updateDto.profile_version && existingProfile.profile_version && 
        updateDto.profile_version < existingProfile.profile_version) {
      throw new BadRequestException('Profile version cannot be rolled back');
    }

    // Validate completion status changes
    if (updateDto.is_completed === false && existingProfile.is_completed === true) {
      // Only admins can uncomplete profiles
      const user = await this.prisma.user.findUnique({
        where: { id: userId || existingProfile.user_id },
        select: { role: true },
      });

      if (!user || user.role !== 'ADMIN') {
        throw new BadRequestException('Only administrators can mark completed profiles as incomplete');
      }
    }
  }

  /**
   * Validate partial update logic
   */
  private validatePartialUpdate(existingProfile: Profile, updateData: any): void {
    // Ensure critical fields are not accidentally nullified
    const criticalFields = ['profile_version', 'last_updated'];
    
    criticalFields.forEach(field => {
      if (updateData[field] === null || updateData[field] === undefined) {
        if (field === 'profile_version') {
          updateData[field] = existingProfile.profile_version || 1;
        } else if (field === 'last_updated') {
          updateData[field] = new Date();
        }
      }
    });

    // Validate data consistency
    if (updateData.is_completed === true) {
      const requiredForCompletion = ['survey_responses', 'belief_summary', 'ideology_scores'];
      const hasRequired = requiredForCompletion.every(field => {
        return (updateData[field] !== undefined ? updateData[field] : existingProfile[field]);
      });

      if (!hasRequired) {
        throw new BadRequestException('Cannot mark profile as completed without required fields: survey_responses, belief_summary, ideology_scores');
      }
    }
  }

  /**
   * Create profile history record for audit trail
   */
  private async createProfileHistoryRecord(profile: Profile, action: string): Promise<void> {
    try {
      // Store a snapshot of the profile before changes
      const historyRecord = {
        profile_id: profile.id,
        action,
        data_snapshot: {
          is_completed: profile.is_completed,
          completion_date: profile.completion_date,
          survey_responses: profile.survey_responses,
          belief_summary: profile.belief_summary,
          ideology_scores: profile.ideology_scores,
          opinion_plasticity: profile.opinion_plasticity,
          profile_version: profile.profile_version,
          last_updated: profile.last_updated,
        },
        timestamp: new Date(),
      };

      // For now, log to application logs (in Phase 3, this could go to a dedicated audit table)
      this.logger.log(`Profile History: ${JSON.stringify(historyRecord)}`);
    } catch (error) {
      this.logger.error('Failed to create profile history record:', error);
      // Don't fail the main operation if history logging fails
    }
  }

  /**
   * Log profile update with change tracking
   */
  private async logProfileUpdate(
    beforeProfile: Profile, 
    afterProfile: Profile, 
    userId?: string
  ): Promise<void> {
    try {
      const changes = this.detectProfileChanges(beforeProfile, afterProfile);
      
      if (changes.length > 0) {
        const logEntry = {
          profile_id: afterProfile.id,
          user_id: userId || afterProfile.user_id,
          action: 'profile_update',
          changes,
          timestamp: new Date(),
          profile_version_before: beforeProfile.profile_version,
          profile_version_after: afterProfile.profile_version,
        };

        this.logger.log(`Profile Update: ${JSON.stringify(logEntry)}`);
      }
    } catch (error) {
      this.logger.error('Failed to log profile update:', error);
    }
  }

  /**
   * Detect changes between profile versions
   */
  private detectProfileChanges(before: Profile, after: Profile): any[] {
    const changes: any[] = [];
    const fieldsToCompare = [
      'is_completed', 'completion_date', 'survey_responses', 
      'belief_summary', 'ideology_scores', 'opinion_plasticity'
    ];

    fieldsToCompare.forEach(field => {
      const beforeValue = before[field];
      const afterValue = after[field];

      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changes.push({
          field,
          before: beforeValue,
          after: afterValue,
          changed_at: after.last_updated,
        });
      }
    });

    return changes;
  }

  /**
   * Task 2.2.2.5: Profile comparison utilities
   */

  /**
   * Compare two profiles and generate detailed diff report
   */
  async compareProfiles(
    profile1Id: string, 
    profile2Id: string, 
    options?: { includeMetadata?: boolean }
  ): Promise<ProfileComparisonResult> {
    const [profile1, profile2] = await Promise.all([
      this.findProfile(profile1Id),
      this.findProfile(profile2Id),
    ]);

    if (!profile1 || !profile2) {
      throw new NotFoundException('One or both profiles not found for comparison');
    }

    return this.generateProfileComparison(profile1, profile2, options);
  }

  /**
   * Compare profile versions (current vs previous)
   */
  async compareProfileVersions(
    profileId: string,
    version1: number,
    version2: number
  ): Promise<ProfileVersionComparison> {
    // In a full implementation, this would query a profile_history table
    // For now, we'll simulate with current profile and change detection
    const currentProfile = await this.findProfile(profileId);
    if (!currentProfile) {
      throw new NotFoundException(`Profile with ID ${profileId} not found`);
    }

    // Simulate version comparison (in practice, this would query historical data)
    const comparison: ProfileVersionComparison = {
      profile_id: profileId,
      version_before: version1,
      version_after: version2,
      changes: [],
      changed_at: currentProfile.last_updated,
      change_summary: `Version comparison from ${version1} to ${version2}`,
    };

    // In a real implementation, you would fetch actual historical data
    this.logger.warn(`Profile version comparison simulated for profile ${profileId}`);
    
    return comparison;
  }

  /**
   * Get profile modification history
   */
  async getProfileHistory(
    profileId: string,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
      changeTypes?: string[];
    }
  ): Promise<ProfileHistoryResult> {
    // In a full implementation, this would query a dedicated audit/history table
    // For now, we'll return a simulated history based on current profile data
    const profile = await this.findProfile(profileId);
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${profileId} not found`);
    }

    const { limit = 50, startDate, endDate } = options || {};

    // Simulate history entries (in practice, this would be real historical data)
    const historyEntries: ProfileHistoryEntry[] = [
      {
        id: `${profileId}_history_1`,
        profile_id: profileId,
        action: 'create',
        changes: [],
        timestamp: profile.created_at,
        version_before: null,
        version_after: 1,
        user_id: profile.user_id,
      },
    ];

    // Add simulated update entries based on current version
    if (profile.profile_version && profile.profile_version > 1) {
      for (let i = 2; i <= profile.profile_version; i++) {
        historyEntries.push({
          id: `${profileId}_history_${i}`,
          profile_id: profileId,
          action: 'update',
          changes: [{ field: 'simulated_change', before: 'old_value', after: 'new_value' }],
          timestamp: profile.last_updated,
          version_before: i - 1,
          version_after: i,
          user_id: profile.user_id,
        });
      }
    }

    return {
      profile_id: profileId,
      total_changes: historyEntries.length,
      entries: historyEntries.slice(0, limit),
      has_more: historyEntries.length > limit,
    };
  }

  /**
   * Generate detailed comparison between two profiles
   */
  private generateProfileComparison(
    profile1: any,
    profile2: any,
    options?: { includeMetadata?: boolean }
  ): ProfileComparisonResult {
    const { includeMetadata = false } = options || {};
    const differences: ProfileDifference[] = [];

    // Compare basic fields
    const fieldsToCompare = [
      'is_completed',
      'completion_date',
      'belief_summary',
      'opinion_plasticity',
      'profile_version',
    ];

    fieldsToCompare.forEach(field => {
      const value1 = profile1[field];
      const value2 = profile2[field];

      if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        differences.push({
          field,
          profile1_value: value1,
          profile2_value: value2,
          difference_type: this.categorizeDifference(field, value1, value2),
        });
      }
    });

    // Compare complex fields (JSON data)
    this.compareJsonFields(profile1, profile2, differences);

    // Compare user information
    if (profile1.user && profile2.user) {
      this.compareUserFields(profile1.user, profile2.user, differences);
    }

    const result: ProfileComparisonResult = {
      profile1_id: profile1.id,
      profile2_id: profile2.id,
      total_differences: differences.length,
      differences,
      similarity_score: this.calculateSimilarityScore(differences.length, fieldsToCompare.length),
      compared_at: new Date(),
    };

    if (includeMetadata) {
      result.metadata = {
        profile1_created: profile1.created_at,
        profile2_created: profile2.created_at,
        profile1_updated: profile1.last_updated,
        profile2_updated: profile2.last_updated,
        profile1_version: profile1.profile_version,
        profile2_version: profile2.profile_version,
      };
    }

    return result;
  }

  /**
   * Compare JSON fields like survey_responses and ideology_scores
   */
  private compareJsonFields(profile1: any, profile2: any, differences: ProfileDifference[]): void {
    // Compare survey responses
    if (profile1.survey_responses || profile2.survey_responses) {
      const surveyDiff = this.compareJsonData(
        profile1.survey_responses,
        profile2.survey_responses,
        'survey_responses'
      );
      if (surveyDiff) differences.push(surveyDiff);
    }

    // Compare ideology scores
    if (profile1.ideology_scores || profile2.ideology_scores) {
      const ideologyDiff = this.compareJsonData(
        profile1.ideology_scores,
        profile2.ideology_scores,
        'ideology_scores'
      );
      if (ideologyDiff) differences.push(ideologyDiff);
    }
  }

  /**
   * Compare user fields between profiles
   */
  private compareUserFields(user1: any, user2: any, differences: ProfileDifference[]): void {
    const userFields = ['first_name', 'last_name', 'username', 'role'];
    
    userFields.forEach(field => {
      if (user1[field] !== user2[field]) {
        differences.push({
          field: `user.${field}`,
          profile1_value: user1[field],
          profile2_value: user2[field],
          difference_type: 'value_change',
        });
      }
    });
  }

  /**
   * Compare JSON data structures
   */
  private compareJsonData(data1: any, data2: any, fieldName: string): ProfileDifference | null {
    if (JSON.stringify(data1) !== JSON.stringify(data2)) {
      return {
        field: fieldName,
        profile1_value: data1,
        profile2_value: data2,
        difference_type: 'structure_change',
      };
    }
    return null;
  }

  /**
   * Categorize the type of difference between values
   */
  private categorizeDifference(field: string, value1: any, value2: any): ProfileDifference['difference_type'] {
    if (value1 === null && value2 !== null) return 'added';
    if (value1 !== null && value2 === null) return 'removed';
    if (typeof value1 !== typeof value2) return 'type_change';
    
    if (field === 'opinion_plasticity' && typeof value1 === 'number' && typeof value2 === 'number') {
      const diff = Math.abs(value1 - value2);
      if (diff > 0.3) return 'major_change';
      if (diff > 0.1) return 'moderate_change';
      return 'minor_change';
    }

    return 'value_change';
  }

  /**
   * Calculate similarity score between profiles (0-1, where 1 is identical)
   */
  private calculateSimilarityScore(differenceCount: number, totalFieldsCompared: number): number {
    if (totalFieldsCompared === 0) return 1;
    const similarity = (totalFieldsCompared - differenceCount) / totalFieldsCompared;
    return Math.round(similarity * 1000) / 1000; // Round to 3 decimal places
  }
}

// Types for profile comparison
export interface ProfileComparisonResult {
  profile1_id: string;
  profile2_id: string;
  total_differences: number;
  differences: ProfileDifference[];
  similarity_score: number;
  compared_at: Date;
  metadata?: {
    profile1_created: Date;
    profile2_created: Date;
    profile1_updated: Date;
    profile2_updated: Date;
    profile1_version?: number;
    profile2_version?: number;
  };
}

export interface ProfileDifference {
  field: string;
  profile1_value: any;
  profile2_value: any;
  difference_type: 'added' | 'removed' | 'value_change' | 'type_change' | 'structure_change' | 'major_change' | 'moderate_change' | 'minor_change';
}

export interface ProfileVersionComparison {
  profile_id: string;
  version_before: number;
  version_after: number;
  changes: any[];
  changed_at: Date;
  change_summary: string;
}

export interface ProfileHistoryResult {
  profile_id: string;
  total_changes: number;
  entries: ProfileHistoryEntry[];
  has_more: boolean;
}

export interface ProfileHistoryEntry {
  id: string;
  profile_id: string;
  action: 'create' | 'update' | 'delete' | 'restore';
  changes: any[];
  timestamp: Date;
  version_before: number | null;
  version_after: number;
  user_id: string;
}
