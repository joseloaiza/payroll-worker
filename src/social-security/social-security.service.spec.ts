import { Test, TestingModule } from '@nestjs/testing';
import { SocialSecurityService } from './social-security.service';

describe('SocialSecurityService', () => {
  let service: SocialSecurityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SocialSecurityService],
    }).compile();

    service = module.get<SocialSecurityService>(SocialSecurityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
