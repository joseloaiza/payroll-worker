import { Test, TestingModule } from '@nestjs/testing';
import { RecurrentPaymentService } from './recurrent-payment.service';

describe('RecurrentPaymentService', () => {
  let service: RecurrentPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecurrentPaymentService],
    }).compile();

    service = module.get<RecurrentPaymentService>(RecurrentPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
