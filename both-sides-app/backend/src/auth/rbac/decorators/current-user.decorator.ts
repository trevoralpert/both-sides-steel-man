/**
 * Enhanced user decorator that provides full user object from database
 * Task 2.2.7.2: Create RBAC middleware and decorators
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  clerk_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  role: string;
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
  profile?: any;
  enrollments?: any[];
  created_classes?: any[];
}

/**
 * Decorator to get the current authenticated user with full database information
 * This decorator should be used with the RbacGuard which populates request.dbUser
 * 
 * @example
 * async getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   // user contains full database information including role, profile, etc.
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    // First try to get the full database user (available after RbacGuard)
    const dbUser = request.dbUser;
    if (dbUser) {
      return data ? dbUser[data] : dbUser;
    }
    
    // Fallback to JWT user if dbUser is not available
    const jwtUser = request.user;
    if (jwtUser) {
      return data ? jwtUser[data] : jwtUser;
    }
    
    return null;
  },
);
