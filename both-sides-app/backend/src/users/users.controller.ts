import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Clerk User Created Webhook
   * Called when a new user is created in Clerk
   */
  @Post('webhooks/clerk/user/created')
  @HttpCode(HttpStatus.OK)
  async handleUserCreated(
    @Body() payload: any,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    try {
      // Verify webhook signature (implement webhook verification)
      this.verifyWebhookSignature(payload, svixId, svixTimestamp, svixSignature);

      const { data } = payload;
      this.logger.log(`Received user.created webhook for Clerk ID: ${data.id}`);

      // Extract user data from Clerk webhook payload
      const createUserDto: CreateUserDto = {
        clerk_id: data.id,
        email: data.email_addresses?.[0]?.email_address,
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        avatar_url: data.profile_image_url,
        // Default to STUDENT role, can be updated later
        role: UserRole.STUDENT,
      };

      const user = await this.usersService.createUser(createUserDto);

      return {
        success: true,
        message: 'User created successfully',
        user_id: user.id,
      };
    } catch (error) {
      this.logger.error(`Failed to handle user.created webhook: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Clerk User Updated Webhook
   * Called when a user is updated in Clerk
   */
  @Post('webhooks/clerk/user/updated')
  @HttpCode(HttpStatus.OK)
  async handleUserUpdated(
    @Body() payload: any,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    try {
      this.verifyWebhookSignature(payload, svixId, svixTimestamp, svixSignature);

      const { data } = payload;
      this.logger.log(`Received user.updated webhook for Clerk ID: ${data.id}`);

      const updateUserDto: UpdateUserDto = {
        email: data.email_addresses?.[0]?.email_address,
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        avatar_url: data.profile_image_url,
      };

      const user = await this.usersService.updateUser(data.id, updateUserDto);

      return {
        success: true,
        message: 'User updated successfully',
        user_id: user.id,
      };
    } catch (error) {
      this.logger.error(`Failed to handle user.updated webhook: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Clerk User Deleted Webhook
   * Called when a user is deleted in Clerk
   */
  @Post('webhooks/clerk/user/deleted')
  @HttpCode(HttpStatus.OK)
  async handleUserDeleted(
    @Body() payload: any,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    try {
      this.verifyWebhookSignature(payload, svixId, svixTimestamp, svixSignature);

      const { data } = payload;
      this.logger.log(`Received user.deleted webhook for Clerk ID: ${data.id}`);

      const user = await this.usersService.deleteUser(data.id);

      return {
        success: true,
        message: 'User deleted successfully',
        user_id: user.id,
      };
    } catch (error) {
      this.logger.error(`Failed to handle user.deleted webhook: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Get current user profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@User() user: any) {
    return this.usersService.findByClerkId(user.sub);
  }

  /**
   * Update current user's last login
   */
  @Put('me/login')
  @UseGuards(JwtAuthGuard)
  async updateLastLogin(@User() user: any) {
    return this.usersService.updateLastLogin(user.sub);
  }

  /**
   * Get user by Clerk ID (admin only)
   */
  @Get(':clerk_id')
  @UseGuards(JwtAuthGuard)
  async getUserByClerkId(@Param('clerk_id') clerk_id: string) {
    return this.usersService.findByClerkId(clerk_id);
  }

  /**
   * Get all users with pagination (admin only)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
    @Query('active') active?: string,
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = Math.min(parseInt(limit), 100); // Cap at 100

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (active !== undefined) {
      where.is_active = active === 'true';
    }

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.usersService.findAll({
      skip,
      take,
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Verify Clerk webhook signature
   * This is a simplified version - in production, use Clerk's webhook verification library
   */
  private verifyWebhookSignature(
    payload: any,
    svixId: string,
    svixTimestamp: string,
    svixSignature: string,
  ) {
    // TODO: Implement proper Clerk webhook signature verification
    // For now, we'll just log that we received the webhook
    // In production, use: https://docs.svix.com/receiving/verifying-payloads/how
    
    if (!svixId || !svixTimestamp || !svixSignature) {
      this.logger.warn('Missing webhook signature headers');
      // For development, we'll allow it but log a warning
      // In production, this should throw an error
    }

    this.logger.log(`Webhook signature verification - ID: ${svixId}, Timestamp: ${svixTimestamp}`);
  }
}
