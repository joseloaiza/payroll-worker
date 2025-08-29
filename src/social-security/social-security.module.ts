import { Module } from '@nestjs/common';
import { SocialSecurityService } from './social-security.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Solidarity } from './entities/solidarity.entity';
import { MovementsModule } from 'src/movements/movements.module';
import { CodesConfigModule } from 'src/config/codes-config.module';
import { NoveltiesModule } from 'src/novelties/novelties.module';
import { SolidarityRepository } from './solidarity.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Solidarity]),
    MovementsModule,
    CodesConfigModule,
    NoveltiesModule,
  ],
  providers: [SocialSecurityService, SolidarityRepository],
  exports: [SocialSecurityService, SolidarityRepository],
})
export class SocialSecurityModule {}
