/**
 * @Roles decorator for role-based route protection
 * Task 2.2.7.2: Create RBAC middleware and decorators
 */

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles are allowed to access a route
 * @param roles - Array of UserRole values that are allowed access
 * 
 * @example
 * @Roles(UserRole.ADMIN)
 * async adminOnlyEndpoint() { ... }
 * 
 * @example
 * @Roles(UserRole.TEACHER, UserRole.ADMIN)
 * async teacherAndAdminEndpoint() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
