/**
 * @Permissions decorator for fine-grained permission-based route protection
 * Task 2.2.7.2: Create RBAC middleware and decorators
 */

import { SetMetadata } from '@nestjs/common';
import { Permission } from '../permissions';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify which permissions are required to access a route
 * @param permissions - Array of Permission values that are required
 * 
 * @example
 * @Permissions(Permission.USER_READ_ANY)
 * async getAllUsers() { ... }
 * 
 * @example
 * @Permissions(Permission.CLASS_CREATE, Permission.CLASS_MANAGE_ENROLLMENT)
 * async createClassWithEnrollment() { ... }
 */
export const Permissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
