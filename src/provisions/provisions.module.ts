import { Module } from '@nestjs/common';
import { UnemploymentService } from './unemployment/unemployment.service';
import { BonusPaymentService } from './bonus-payment/bonus-payment.service';
import { CodesConfigModule } from 'src/config/codes-config.module';
import { MovementsModule } from 'src/movements/movements.module';
import { CompanyModule } from 'src/company/company.module';

@Module({
  imports: [CodesConfigModule, MovementsModule, CompanyModule],
  providers: [UnemploymentService, BonusPaymentService],
})
export class ProvisionsModule {}
