import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserSearchDto, UserListDto } from './dto/user-search.dto';
import { UpdateUserStatusDto, UserStatus, BulkUserStatusDto, BulkImportUserDto, BulkUpdateUserDto, CreateBulkUserDto } from './dto/user-status.dto';
import { UserStatistics, UserEngagementMetrics } from './dto/user-analytics.dto';
import { User, UserRole, Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user from Clerk webhook data
   */
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Check if user already exists by clerk_id
      const existingUser = await this.findByClerkId(createUserDto.clerk_id);
      if (existingUser) {
        throw new ConflictException('User with this Clerk ID already exists');
      }

      // Check email uniqueness
      if (createUserDto.email) {
        const existingEmail = await this.findByEmail(createUserDto.email);
        if (existingEmail) {
          throw new ConflictException('User with this email already exists');
        }
      }

      // Generate username if not provided
      let username = createUserDto.username;
      if (!username && createUserDto.email) {
        username = await this.generateUniqueUsername(createUserDto.email.split('@')[0]);
      }

      const userData: Prisma.UserCreateInput = {
        clerk_id: createUserDto.clerk_id,
        email: createUserDto.email,
        first_name: createUserDto.first_name,
        last_name: createUserDto.last_name,
        username,
        avatar_url: createUserDto.avatar_url,
        role: createUserDto.role || UserRole.STUDENT,
        is_active: true,
      };

      const user = await this.prisma.user.create({
        data: userData,
      });

      this.logger.log(`Created user with ID: ${user.id}, Clerk ID: ${user.clerk_id}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user from Clerk webhook data
   */
  async updateUser(clerk_id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const existingUser = await this.findByClerkId(clerk_id);
      if (!existingUser) {
        throw new NotFoundException(`User with Clerk ID ${clerk_id} not found`);
      }

      // Handle username uniqueness if being updated
      let username = updateUserDto.username;
      if (username && username !== existingUser.username) {
        const existingUsername = await this.findByUsername(username);
        if (existingUsername && existingUsername.id !== existingUser.id) {
          username = await this.generateUniqueUsername(username);
        }
      }

      const updateData: Prisma.UserUpdateInput = {
        email: updateUserDto.email,
        first_name: updateUserDto.first_name,
        last_name: updateUserDto.last_name,
        username,
        avatar_url: updateUserDto.avatar_url,
        role: updateUserDto.role,
        last_login_at: new Date(),
      };

      const user = await this.prisma.user.update({
        where: { clerk_id },
        data: updateData,
      });

      this.logger.log(`Updated user with ID: ${user.id}, Clerk ID: ${user.clerk_id}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Soft delete user (deactivate)
   */
  async deleteUser(clerk_id: string): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { clerk_id },
        data: { 
          is_active: false,
          // Clear sensitive data
          email: `deleted_${Date.now()}@bothsides.deleted`,
          username: null,
        },
      });

      this.logger.log(`Soft deleted user with ID: ${user.id}, Clerk ID: ${user.clerk_id}`);
      return user;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with Clerk ID ${clerk_id} not found`);
      }
      this.logger.error(`Failed to delete user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find user by Clerk ID
   */
  async findByClerkId(clerk_id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { clerk_id },
      include: {
        profile: true,
        enrollments: {
          include: {
            class: {
              include: {
                organization: true,
              },
            },
          },
        },
        created_classes: true,
      },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  /**
   * Generate unique username by appending numbers if needed
   */
  private async generateUniqueUsername(baseUsername: string): Promise<string> {
    let username = baseUsername.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    let counter = 1;

    while (await this.findByUsername(username)) {
      username = `${baseUsername}_${counter}`;
      counter++;
    }

    return username;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(clerk_id: string): Promise<User> {
    return this.prisma.user.update({
      where: { clerk_id },
      data: { last_login_at: new Date() },
    });
  }

  /**
   * Get all users with pagination and filters (enhanced version)
   */
  async findAll(options: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
    include?: Prisma.UserInclude;
  }) {
    const { skip = 0, take = 50, where, orderBy, include } = options;

    const defaultInclude: Prisma.UserInclude = {
      profile: true,
      _count: {
        select: {
          enrollments: true,
          created_classes: true,
        },
      },
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        where,
        orderBy,
        include: include || defaultInclude,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      hasMore: skip + take < total,
      page: Math.floor(skip / take) + 1,
      totalPages: Math.ceil(total / take),
    };
  }

  /**
   * Enhanced user search with advanced filtering
   */
  async searchUsers(searchDto: UserSearchDto) {
    try {
      const { 
        search, 
        role, 
        is_active, 
        organization_id, 
        page = 1, 
        limit = 50, 
        sortBy = 'created_at', 
        sortOrder = 'desc' 
      } = searchDto;

      const skip = (page - 1) * limit;
      const where: Prisma.UserWhereInput = {};

      // Text search across multiple fields
      if (search) {
        where.OR = [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Role filter
      if (role) {
        where.role = role;
      }

      // Active status filter
      if (is_active !== undefined) {
        where.is_active = is_active;
      }

      // Organization filter (if user is enrolled in classes of that org)
      if (organization_id) {
        where.enrollments = {
          some: {
            class: {
              organization_id,
            },
          },
        };
      }

      // Dynamic sorting
      const orderBy: Prisma.UserOrderByWithRelationInput = {
        [sortBy]: sortOrder as 'asc' | 'desc',
      };

      const result = await this.findAll({
        skip,
        take: limit,
        where,
        orderBy,
        include: {
          profile: true,
          enrollments: {
            include: {
              class: {
                include: {
                  organization: true,
                },
              },
            },
          },
          created_classes: {
            include: {
              organization: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              created_classes: true,
            },
          },
        },
      });

      return {
        ...result,
        searchCriteria: searchDto,
      };
    } catch (error) {
      this.logger.error(`Failed to search users: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get user relationships (classes, enrollments)
   */
  async getUserRelationships(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          enrollments: {
            include: {
              class: {
                include: {
                  organization: true,
                  teacher: {
                    select: {
                      id: true,
                      first_name: true,
                      last_name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          created_classes: {
            include: {
              organization: true,
              enrollments: {
                include: {
                  user: {
                    select: {
                      id: true,
                      first_name: true,
                      last_name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      return {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          username: user.username,
          role: user.role,
          is_active: user.is_active,
        },
        profile: user.profile,
        enrollments: user.enrollments,
        createdClasses: user.created_classes,
        statistics: {
          totalEnrollments: user.enrollments.length,
          activeEnrollments: user.enrollments.filter(e => e.enrollment_status === 'ACTIVE').length,
          totalClassesCreated: user.created_classes.length,
          activeClassesCreated: user.created_classes.filter(c => c.is_active).length,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get user relationships: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get user statistics and analytics
   */
  async getUserStatistics(options?: {
    organizationId?: string;
    role?: UserRole;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UserStatistics> {
    try {
      const { organizationId, role, startDate, endDate } = options || {};
      
      const where: Prisma.UserWhereInput = {};
      
      if (role) {
        where.role = role;
      }
      
      if (organizationId) {
        where.OR = [
          {
            enrollments: {
              some: {
                class: {
                  organization_id: organizationId,
                },
              },
            },
          },
          {
            created_classes: {
              some: {
                organization_id: organizationId,
              },
            },
          },
        ];
      }
      
      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at.gte = startDate;
        if (endDate) where.created_at.lte = endDate;
      }

      // Get basic user counts
      const [totalUsers, activeUsers, usersByRole, usersByStatus, recentUsers] = await Promise.all([
        this.prisma.user.count({ where }),
        this.prisma.user.count({ where: { ...where, is_active: true } }),
        this.prisma.user.groupBy({
          by: ['role'],
          where,
          _count: { role: true },
        }),
        this.prisma.user.groupBy({
          by: ['is_active'],
          where,
          _count: { is_active: true },
        }),
        this.prisma.user.count({
          where: {
            ...where,
            created_at: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
      ]);

      // Calculate profile completion rate
      const usersWithProfiles = await this.prisma.user.count({
        where: {
          ...where,
          profile: {
            is_completed: true,
          },
        },
      });

      // Get engagement metrics
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [dailyActive, weeklyActive, monthlyActive] = await Promise.all([
        this.prisma.user.count({
          where: { ...where, last_login_at: { gte: dayAgo } },
        }),
        this.prisma.user.count({
          where: { ...where, last_login_at: { gte: weekAgo } },
        }),
        this.prisma.user.count({
          where: { ...where, last_login_at: { gte: monthAgo } },
        }),
      ]);

      // Process role counts
      const roleCountMap = usersByRole.reduce((acc, item) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {} as Record<string, number>);

      // Process status counts
      const statusCountMap = usersByStatus.reduce((acc, item) => {
        acc[item.is_active ? 'active' : 'inactive'] = item._count.is_active;
        return acc;
      }, { active: 0, inactive: 0 });

      return {
        totalUsers,
        activeUsers,
        usersByRole: {
          students: roleCountMap['STUDENT'] || 0,
          teachers: roleCountMap['TEACHER'] || 0,
          admins: roleCountMap['ADMIN'] || 0,
        },
        usersByStatus: {
          active: statusCountMap.active,
          inactive: statusCountMap.inactive,
          suspended: 0, // Would need a separate field for this
        },
        recentRegistrations: recentUsers,
        profileCompletionRate: totalUsers > 0 ? (usersWithProfiles / totalUsers) * 100 : 0,
        engagementMetrics: {
          dailyActiveUsers: dailyActive,
          weeklyActiveUsers: weeklyActive,
          monthlyActiveUsers: monthlyActive,
          averageLoginFrequency: weeklyActive > 0 ? weeklyActive / 7 : 0,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get user statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get user engagement metrics for specific users or top engaged users
   */
  async getUserEngagementMetrics(options?: {
    userId?: string;
    limit?: number;
    days?: number;
  }): Promise<UserEngagementMetrics[]> {
    try {
      const { userId, limit = 50, days = 30 } = options || {};
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const where: Prisma.UserWhereInput = {
        is_active: true,
      };
      
      if (userId) {
        where.id = userId;
      }

      const users = await this.prisma.user.findMany({
        where,
        take: limit,
        include: {
          profile: true,
          enrollments: {
            where: {
              enrollment_status: 'ACTIVE',
            },
          },
          created_classes: {
            where: {
              is_active: true,
            },
          },
        },
      });

      const metrics: UserEngagementMetrics[] = users.map(user => {
        // Calculate login frequency (days since last login)
        const daysSinceLogin = user.last_login_at 
          ? Math.floor((Date.now() - user.last_login_at.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        
        const loginFrequency = Math.max(0, 100 - daysSinceLogin); // Score out of 100

        // Calculate profile completeness
        let profileCompleteness = 0;
        if (user.profile) {
          profileCompleteness = user.profile.is_completed ? 100 : 50;
          if (user.profile.survey_responses) profileCompleteness += 20;
          if (user.profile.belief_summary) profileCompleteness += 15;
          if (user.profile.ideology_scores) profileCompleteness += 15;
        }
        profileCompleteness = Math.min(profileCompleteness, 100);

        // Calculate debate participation (placeholder - would need debate data)
        const debateParticipation = 0; // TODO: implement when debates are available

        // Calculate class activity
        const classActivity = user.role === 'TEACHER' 
          ? Math.min(user.created_classes.length * 20, 100)
          : Math.min(user.enrollments.length * 25, 100);

        // Overall engagement score
        const engagementScore = Math.round(
          (loginFrequency * 0.3 + 
           profileCompleteness * 0.3 + 
           debateParticipation * 0.2 + 
           classActivity * 0.2)
        );

        return {
          userId: user.id,
          userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email,
          loginFrequency,
          lastLoginAt: user.last_login_at,
          profileCompleteness,
          debateParticipation,
          classActivity,
          engagementScore,
        };
      });

      // Sort by engagement score if not filtering by specific user
      if (!userId) {
        metrics.sort((a, b) => b.engagementScore - a.engagementScore);
      }

      return metrics;
    } catch (error) {
      this.logger.error(`Failed to get user engagement metrics: ${error.message}`, error.stack);
      throw error;
    }
  }
}
