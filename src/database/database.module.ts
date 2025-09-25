import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
//import { DatabaseService } from './database.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const sslEnabled = configService.get<string>('POSTGRES_SSL') === 'true';

        return {
          type: 'postgres',
          host: configService.get<string>('POSTGRES_HOST'),
          port: configService.get<number>('POSTGRES_PORT'),
          username: configService.get<string>('POSTGRES_USER'),
          password: configService.get<string>('POSTGRES_PASSWORD'),
          database: configService.get<string>('POSTGRES_DB'),
          autoLoadEntities: true,
          //entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          synchronize: false,
          retryAttempts: 5,
          etryAttempts: 5,
          retryDelay: 3000,
          // 👇 Add connection pool + keepAlive
          extra: {
            ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
            keepAlive: true,
            connectionTimeoutMillis: 10000, // 10s
            idleTimeoutMillis: 30000, // 30s
            max: 10, // pool size
          },
          // Enable logging for debugging
          logging: true,
        };
      },
    }),
  ],
  providers: [],
})
export class DatabaseModule {}
