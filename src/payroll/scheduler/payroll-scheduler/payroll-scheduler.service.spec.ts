import { Test, TestingModule } from '@nestjs/testing';
import { PayrollSchedulerService } from './payroll-scheduler.service';

describe('PayrollSchedulerService', () => {
  let service: PayrollSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayrollSchedulerService],
    }).compile();

    service = module.get<PayrollSchedulerService>(PayrollSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
