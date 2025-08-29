import { Test, TestingModule } from '@nestjs/testing';
import { AbsenteeismService } from './absenteeism.service';

describe('AbsenteeismService', () => {
  let service: AbsenteeismService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AbsenteeismService],
    }).compile();

    service = module.get<AbsenteeismService>(AbsenteeismService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
