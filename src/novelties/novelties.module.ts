import { Module } from '@nestjs/common';
import { AbsenteeismService } from './absenteeism/absenteeism.service';
import { RecurrentPaymentService } from './recurrent-payment/recurrent-payment.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbsenteeHistory } from './entities/absenteeHistory.entity';
import { CodesConfig } from 'src/config/entities/codes-config.entity';
import { CodesConfigModule } from 'src/config/codes-config.module';
import { AbsenteeHistoryRepository } from './absenteeism/absentee-history.repository';
import { RecurrentPaymentRepository } from './recurrent-payment/recurrent-payment.repository';
import { MovementsModule } from 'src/movements/movements.module';
import { RecurrentPayment } from './entities/recurrent-payment.entity';
import { AbsenteeType } from './entities/absentee-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AbsenteeHistory, RecurrentPayment, AbsenteeType]),
    CodesConfig,
    CodesConfigModule,
    MovementsModule,
  ],
  providers: [
    AbsenteeismService,
    RecurrentPaymentService,
    AbsenteeHistoryRepository,
    RecurrentPaymentRepository,
  ],
  exports: [
    AbsenteeismService,
    RecurrentPaymentService,
    AbsenteeHistoryRepository,
    RecurrentPaymentRepository,
  ],
})
export class NoveltiesModule {}
