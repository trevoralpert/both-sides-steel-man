import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { ProfileErrorInterceptor } from './interceptors/profile-error.interceptor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProfilesController],
  providers: [
    ProfilesService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ProfileErrorInterceptor,
    },
  ],
  exports: [ProfilesService],
})
export class ProfilesModule {}
