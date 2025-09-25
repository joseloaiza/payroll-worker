// redis.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const provider = process.env.REDIS_PROVIDER || 'local';

        let options: any = {};
        switch (provider) {
          case 'azure':
            options = {
              socket: {
                host: configService.get<string>('REDIS_HOST'),
                port:
                  parseInt(configService.get<string>('REDIS_PORT')!) || 6380,
              },
              password: configService.get<string>('REDIS_PASSWORD'),
              tls: {}, // TLS required in Azure
              ttl: 36000,
            };
            break;

          case 'aws':
            options = {
              socket: {
                host: process.env.REDIS_HOST,
                port: Number(process.env.REDIS_PORT) || 6379,
              },
              password: process.env.REDIS_PASSWORD, // AWS Elasticache may or may not need this
              // no TLS unless configured
              ttl: 36000,
            };
            break;

          case 'gcp':
            options = {
              socket: {
                host: process.env.REDIS_HOST,
                port: Number(process.env.REDIS_PORT) || 6379,
              },
              password: process.env.REDIS_PASSWORD, // Memorystore requires auth if enabled
              tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
              ttl: 36000,
            };
            break;

          default: // local
            options = {
              socket: {
                host: process.env.REDIS_HOST || 'redis',
                port: Number(process.env.REDIS_PORT) || 6379,
              },
              ttl: 36000,
            };
            break;
        }

        const store = await redisStore(options);

        return {
          store: () => store,
        };
      },
    }),
  ],
})
export class RedisModule {}

// import { Module } from '@nestjs/common';
// import { CacheModule } from '@nestjs/cache-manager';
// import { redisStore } from 'cache-manager-redis-store';
// import { createClient } from 'redis';
// //import * as redisStore from 'cache-manager-ioredis';

// @Module({
//   imports: [
//     CacheModule.registerAsync({
//       isGlobal: true,
//       useFactory: () => ({
//         store: redisStore({
//           socket: {
//             host: process.env.REDIS_HOST || 'redis', // service name in docker-compose
//             port: Number(process.env.REDIS_PORT) || 6379,
//           },
//           ttl: 36000,
//         }),
//       }),
//     }),
//   ],
// })
//export class RedisModule {}
