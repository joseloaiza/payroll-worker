import { Test, TestingModule } from '@nestjs/testing';
import { CodesConfigService } from '../config/codes-config.service';

describe('CodesConfigService', () => {
  let service: CodesConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CodesConfigService],
    }).compile();

    service = module.get<CodesConfigService>(CodesConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
