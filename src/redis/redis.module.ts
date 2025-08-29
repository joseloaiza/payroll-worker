import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
//import * as redisStore from 'cache-manager-ioredis';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'redis', // service name in docker-compose
            port: Number(process.env.REDIS_PORT) || 6379,
          },
          ttl: 60 * 60,
        }),
      }),
    }),
  ],
})
export class RedisModule {}
