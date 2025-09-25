import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PayrollModule } from './payroll/payroll.module';
//import { RedisModule } from './redis/redis.module';
import { CodesConfigModule } from './config/codes-config.module';
import { DatabaseModule } from './database/database.module';
import configuration from './config/config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { LoggerFactory } from './common/logger/logger-factory';
import { EmployeeModule } from './employee/employee.module';
import { MovementsModule } from './movements/movements.module';
import { NoveltiesModule } from './novelties/novelties.module';
import { SocialSecurityModule } from './social-security/social-security.module';
import { ProvisionsModule } from './provisions/provisions.module';
import { CompanyModule } from './company/company.module';
import { MessagingModule } from './messaging/messaging.module';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { Cache } from 'cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      ignoreEnvFile: false,
    }),
    CacheModule.register({
      isGlobal: true,
    }),
    //RedisModule,
    DatabaseModule,
    PayrollModule,
    CodesConfigModule,
    WinstonModule.forRoot(LoggerFactory('Payroll-worker')),
    EmployeeModule,
    MovementsModule,
    NoveltiesModule,
    SocialSecurityModule,
    ProvisionsModule,
    CompanyModule,
    MessagingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [CacheModule],
})
export class AppModule implements OnModuleInit {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}
  async onModuleInit() {
    // console.log('✅AppModule initialized, Redis should be connected..');
    // // You can test the cache here:
    // await this.cacheManager.set('health-check', 'ok');
    // const value = await this.cacheManager.get('health-check');
    // console.log('Redis health check value: ', value); // should log "ok"
  }
}
