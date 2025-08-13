import { Module, Global } from '@nestjs/common';
import { RedisService } from '../common/services/redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
