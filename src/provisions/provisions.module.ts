import { Module } from '@nestjs/common';
import { UnemploymentService } from './unemployment/unemployment.service';
import { BonusPaymentService } from './bonus-payment/bonus-payment.service';
import { CodesConfigModule } from 'src/config/codes-config.module';
import { MovementsModule } from 'src/movements/movements.module';
import { CompanyModule } from 'src/company/company.module';
import { VacationsService } from './vacations/vacations.service';
import { NoveltiesModule } from 'src/novelties/novelties.module';

@Module({
  imports: [CodesConfigModule, MovementsModule, CompanyModule, NoveltiesModule],
  providers: [UnemploymentService, BonusPaymentService, VacationsService],
  exports: [UnemploymentService, BonusPaymentService, VacationsService],
})
export class ProvisionsModule {}
