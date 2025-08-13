import { Module } from '@nestjs/common';
import { AuditService } from './services/audit.service';
import { AuditConfigService } from './services/audit-config.service';
import { CacheService } from './services/cache.service';
import { RedisService } from './services/redis.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [AuditService, AuditConfigService, CacheService, RedisService],
  exports: [AuditService, AuditConfigService, CacheService, RedisService],
})
export class CommonModule {}
