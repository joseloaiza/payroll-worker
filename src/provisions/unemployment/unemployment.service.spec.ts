import { Test, TestingModule } from '@nestjs/testing';
import { UnemploymentService } from './unemployment.service';

describe('UnemploymentService', () => {
  let service: UnemploymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UnemploymentService],
    }).compile();

    service = module.get<UnemploymentService>(UnemploymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
