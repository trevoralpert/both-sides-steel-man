/**
 * RBAC System Exports
 * Task 2.2.7: Implement Role-Based Access Control (RBAC)
 */

// Permissions and types
export * from './permissions';

// Decorators
export * from './decorators/roles.decorator';
export * from './decorators/permissions.decorator';
export * from './decorators/current-user.decorator';

// Guards
export * from './guards/rbac.guard';
export * from './guards/resource-ownership.guard';

// Services
export * from './services/permission-validation.service';
export * from './services/role-management.service';

// Module
export * from './rbac.module';
