import { Test, TestingModule } from '@nestjs/testing';
import { CompanyPaymentService } from './company-payment.service';

describe('CompanyPaymentService', () => {
  let service: CompanyPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompanyPaymentService],
    }).compile();

    service = module.get<CompanyPaymentService>(CompanyPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
