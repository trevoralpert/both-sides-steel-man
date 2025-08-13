import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Profile, Prisma } from '@prisma/client';
import { ProfileValidationUtil } from './validators/profile-validation.util';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private prisma: PrismaService) {}

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
   * Update an existing profile
   */
  async updateProfile(profileId: string, updateProfileDto: UpdateProfileDto): Promise<Profile> {
    try {
      // Check if profile exists
      const existingProfile = await this.findProfile(profileId);
      if (!existingProfile) {
        throw new NotFoundException(`Profile with ID ${profileId} not found`);
      }

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
   * Find profile by ID
   */
  async findProfile(profileId: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { id: profileId },
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
  }

  /**
   * Find profile by user ID
   */
  async findProfileByUserId(userId: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { user_id: userId },
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
          survey_responses: null,
          belief_summary: null,
          ideology_scores: null,
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
   * Get all profiles with pagination and filters
   */
  async findAllProfiles(options: {
    skip?: number;
    take?: number;
    where?: Prisma.ProfileWhereInput;
    orderBy?: Prisma.ProfileOrderByWithRelationInput;
  }) {
    const { skip = 0, take = 50, where, orderBy } = options;

    const [profiles, total] = await Promise.all([
      this.prisma.profile.findMany({
        skip,
        take,
        where,
        orderBy,
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
      }),
      this.prisma.profile.count({ where }),
    ]);

    return {
      profiles,
      total,
      hasMore: skip + take < total,
    };
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
   * Get profile completion statistics
   */
  async getProfileStats() {
    const [total, completed, pending] = await Promise.all([
      this.prisma.profile.count(),
      this.prisma.profile.count({ where: { is_completed: true } }),
      this.prisma.profile.count({ where: { is_completed: false } }),
    ]);

    return {
      total,
      completed,
      pending,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
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

    // Auto-detect completion status
    const shouldAutoComplete = this.shouldAutoCompleteProfile(inputData, existingProfile);
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
   * Determine if profile should be automatically marked as complete
   */
  private shouldAutoCompleteProfile(inputData: any, existingProfile?: Profile | null): boolean {
    // Merge existing data with new data for completeness check
    const combinedData = {
      ...existingProfile,
      ...inputData,
    };

    return ProfileValidationUtil.isProfileComplete(combinedData);
  }

  /**
   * Generate profile insights based on current data
   */
  async generateProfileInsights(profileId: string): Promise<any> {
    const profile = await this.findProfile(profileId);
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${profileId} not found`);
    }

    const insights = {
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
    if (topScore && topScore[1] > 0.6) {
      return `Primarily ${topScore[0]} (${Math.round(topScore[1] * 100)}%)`;
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

  private generateRecommendations(profile: Profile): string[] {
    const recommendations = [];

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
}
