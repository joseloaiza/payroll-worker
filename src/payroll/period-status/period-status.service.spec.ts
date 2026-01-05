import { Test, TestingModule } from '@nestjs/testing';
import { PeriodStatusService } from './period-status.service';

describe('PeriodStatusService', () => {
  let service: PeriodStatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PeriodStatusService],
    }).compile();

    service = module.get<PeriodStatusService>(PeriodStatusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
