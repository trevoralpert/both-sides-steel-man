import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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
   * Get all users with pagination and filters
   */
  async findAll(options: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    const { skip = 0, take = 50, where, orderBy } = options;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          profile: true,
          _count: {
            select: {
              enrollments: true,
              created_classes: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      hasMore: skip + take < total,
    };
  }
}
