/**
 * RBAC Module - Role-Based Access Control
 * Task 2.2.7: Implement Role-Based Access Control (RBAC)
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';

// Guards
import { RbacGuard } from './guards/rbac.guard';
import { ResourceOwnershipGuard } from './guards/resource-ownership.guard';

// Services
import { PermissionValidationService } from './services/permission-validation.service';
import { RoleManagementService } from './services/role-management.service';

// Controllers
import { RoleManagementController } from './controllers/role-management.controller';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
  ],
  controllers: [
    RoleManagementController,
  ],
  providers: [
    // Guards
    RbacGuard,
    ResourceOwnershipGuard,
    
    // Services
    PermissionValidationService,
    RoleManagementService,
  ],
  exports: [
    // Guards
    RbacGuard,
    ResourceOwnershipGuard,
    
    // Services
    PermissionValidationService,
    RoleManagementService,
  ],
})
export class RbacModule {}
