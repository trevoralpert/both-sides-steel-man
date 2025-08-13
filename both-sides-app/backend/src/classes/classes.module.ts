import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule, // For AuditService and CacheService
    AuthModule, // For RBAC guards and decorators
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService], // Export service for use in other modules
})
export class ClassesModule {}
