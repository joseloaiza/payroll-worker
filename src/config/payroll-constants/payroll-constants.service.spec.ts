import { Test, TestingModule } from '@nestjs/testing';
import { PayrollConstantsService } from './payroll-constants.service';

describe('PayrollConstantsService', () => {
  let service: PayrollConstantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayrollConstantsService],
    }).compile();

    service = module.get<PayrollConstantsService>(PayrollConstantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
