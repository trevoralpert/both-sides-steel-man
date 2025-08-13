import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { ProfileErrorInterceptor } from './interceptors/profile-error.interceptor';
import { ProfileCacheService } from './services/profile-cache.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, RedisModule, CommonModule],
  controllers: [ProfilesController],
  providers: [
    ProfilesService,
    ProfileCacheService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ProfileErrorInterceptor,
    },
  ],
  exports: [ProfilesService, ProfileCacheService],
})
export class ProfilesModule {}
