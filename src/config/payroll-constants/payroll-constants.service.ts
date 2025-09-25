import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PayrollConstants } from './../entities/payroll-constants.entity';
import { CodesConfigService } from '../codes-config/codes-config.service';

export interface PayrollConstantsDto {
  id: string;
  value: number;
}

@Injectable()
export class PayrollConstantsService implements OnApplicationBootstrap {
  private readonly cacheKey = 'payroll_constans:all';
  private readonly logger = new Logger(PayrollConstantsService.name);
  private loadPromise: Promise<PayrollConstants[]> = null;
  private constants: Record<string, number>;

  constructor(
    @InjectRepository(PayrollConstants)
    private readonly payrollConstantsRepository: Repository<PayrollConstants>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}
  async onApplicationBootstrap() {
    try {
      await this.loadConstants();
      this.logger.log('Constants loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load constants', error.stack);
    }
  }

  /**
   * Loads constants from the database into memory.
   * Can be called manually if the constants need to be refreshed dynamically.
   */
  async loadConstants(): Promise<PayrollConstants[]> {
    if (this.loadPromise) {
      return this.loadPromise; // return pending promise if already loading
    }
    this.loadPromise = (async () => {
      try {
        const constants = await this.payrollConstantsRepository.find();

        await this.cacheManager.set(this.cacheKey, constants); // 1 hour TTL
        //this.logger.warn(`Cache set: ${constants.length} items`);
        return constants;
      } catch (error) {
        throw new InternalServerErrorException(error);
      } finally {
        this.loadPromise = null; // reset after finished
      }
    })();
    return this.loadPromise;
    // const constants = await this.payrollConstantsRepository.find();
    // await this.cacheManager.set(this.cacheKey, constants, 36000); // 1 hour TTL
  }

  async getConstants(): Promise<PayrollConstants[]> {
    const cache = await this.cacheManager.get<PayrollConstants[]>(
      this.cacheKey,
    );
    if (Array.isArray(cache) && cache.length > 0) {
      //this.logger.debug('Cache hit for constants');
      return cache;
    }
    //this.logger.debug('Cache miss → loading constants from DB ');
    return this.loadConstants();
  }

  async getConstantValue(id: string): Promise<number> {
    const constant = (await this.getConstants()).find((c) => c.id === id); // reuse logic
    return constant.value;
  }

  async getConstantsByIds(
    idsConstants: Record<string, string>,
    codesConfigService: CodesConfigService,
  ): Promise<Record<string, number>> {
    // 1. Get all codes from codesConfig by IDs
    const codesConfig: Record<string, string> =
      await codesConfigService.getManyCodesByIds(Object.values(idsConstants));

    // 2. Map codesConfig.id → code
    const codeByAlias: Record<string, string> = {};
    for (const [alias, id] of Object.entries(idsConstants)) {
      const code = codesConfig[id];
      if (!code) {
        throw new Error(`Code not found for id "${id}"`);
      }
      codeByAlias[alias] = code;
    }

    // 3. Fetch PayrollConstants for all those codes
    const constants = (await this.getConstants()).filter((c) =>
      Object.values(codeByAlias).includes(c.id),
    ); // reuse logic

    // 4. Build final map alias → value
    const result: Record<string, number> = {};
    for (const [alias, code] of Object.entries(codeByAlias)) {
      const constant = constants.find((p) => p.id === code);
      if (constant === undefined) {
        throw new Error(`Missing constant for code  "${code}"`);
      }

      result[alias] = Number(constant.value);
    }

    return result;
  }
}
