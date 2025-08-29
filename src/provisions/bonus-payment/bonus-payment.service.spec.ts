import { Test, TestingModule } from '@nestjs/testing';
import { BonusPaymentService } from './bonus-payment.service';

describe('BonusPaymentService', () => {
  let service: BonusPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BonusPaymentService],
    }).compile();

    service = module.get<BonusPaymentService>(BonusPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
