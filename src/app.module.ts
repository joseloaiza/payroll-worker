import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PayrollModule } from './payroll/payroll.module';
import { RedisModule } from './redis/redis.module';
import { CodesConfigModule } from './config/codes-config.module';
import { DatabaseModule } from './database/database.module';
import configuration from './config/config';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { LoggerFactory } from './common/logger/logger-factory';
import { EmployeeModule } from './employee/employee.module';
import { MovementsModule } from './movements/movements.module';
import { NoveltiesModule } from './novelties/novelties.module';
import { SocialSecurityModule } from './social-security/social-security.module';
import { ProvisionsModule } from './provisions/provisions.module';
import { CompanyModule } from './company/company.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      ignoreEnvFile: false,
    }),
    DatabaseModule,
    PayrollModule,
    RedisModule,
    CodesConfigModule,
    WinstonModule.forRoot(LoggerFactory('Payroll-worker')),
    EmployeeModule,
    MovementsModule,
    NoveltiesModule,
    SocialSecurityModule,
    ProvisionsModule,
    CompanyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
