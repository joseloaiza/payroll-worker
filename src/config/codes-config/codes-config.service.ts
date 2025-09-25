import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CodesConfig } from './../entities/codes-config.entity';

export interface CodesConfigDto {
  id: string;
  code: string;
  description: string;
  category: string;
}

@Injectable()
export class CodesConfigService implements OnApplicationBootstrap {
  private readonly cacheKey = 'codes_config:all';
  private readonly logger = new Logger(CodesConfigService.name);
  // store pending load promise to avoid multiple DB calls
  private loadPromise: Promise<CodesConfigDto[]> = null;

  constructor(
    @InjectRepository(CodesConfig)
    private readonly repository: Repository<CodesConfig>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}
  async onApplicationBootstrap() {
    try {
      this.logger.log('Redis connection test successful!');
      await this.loadConfig();
      this.logger.log('Codes config loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load codes config ', error.stack);
    }
  }

  async connectAndPing(): Promise<void> {
    try {
      // The `store` object holds the low-level client.
      const redisClient = (this.cacheManager as any).store.client;
      //const redisClient = (this.cacheManager as any).stores[0].client;
      if (redisClient && typeof redisClient.ping === 'function') {
        await redisClient.ping();
        this.logger.log('Redis ping successful!');
      } else {
        this.logger.error(
          'Failed to get Redis client or client.ping is not a function.',
        );
        throw new InternalServerErrorException('Redis client not available.');
      }
    } catch (error) {
      this.logger.error('Redis connection or authentication failed!', error);
      throw new InternalServerErrorException('Failed to connect to Redis.');
    }
  }

  async loadConfig(): Promise<CodesConfigDto[]> {
    if (this.loadPromise) {
      return this.loadPromise; // return pending promise if already loading
    }
    this.loadPromise = (async () => {
      try {
        //await this.connectAndPing();
        const codes = await this.repository.find();
        const plainConfigs: CodesConfigDto[] = codes.map((c) => ({
          id: c.id,
          code: c.code,
          description: c.description,
          category: c.category,
        }));
        const serializedData = JSON.stringify(plainConfigs);
        await this.cacheManager.set(this.cacheKey, serializedData); // 1 hour TTL

        const testKey = 'test-key-string';
        const testValue = 'hello world';
        await this.cacheManager.set(testKey, testValue);
        this.logger.log(
          `Attempted to set a simple string key: ${testKey} with value: ${testValue}`,
        );
        const retrievedValue = await this.cacheManager.get(testKey);
        this.logger.log(`Retrieved value for test key: ${retrievedValue}`);

        this.logger.warn(`Cache set: ${plainConfigs.length} items`);
        return plainConfigs;
      } catch (error) {
        throw new InternalServerErrorException(error);
      } finally {
        this.loadPromise = null; // reset after finished
      }
    })();
    return this.loadPromise;
  }

  /** ✅ Get all codes */
  async getAllCodes(): Promise<CodesConfigDto[]> {
    const serializedCache = await this.cacheManager.get<string>(this.cacheKey);
    // Check if the string exists and is not empty
    if (serializedCache) {
      try {
        // Deserialize the JSON string back into an array of objects
        const cache = JSON.parse(serializedCache);
        if (Array.isArray(cache) && cache.length > 0) {
          this.logger.debug('Cache hit for codes_config');
          return cache;
        }
      } catch (error) {
        this.logger.error('Failed to parse cached data', error);
      }
    }
    // const cache = await this.cacheManager.get<CodesConfigDto[]>(this.cacheKey);
    // if (Array.isArray(cache) && cache.length > 0) {
    //   this.logger.debug('Cache hit for codes_config');
    //   return cache;
    // }
    this.logger.debug('Cache miss → loading from DB ');
    return this.loadConfig();
  }

  async getConfigByCode(code: string): Promise<CodesConfigDto> {
    const configs = await this.getAllCodes();
    return configs.find((cfg) => cfg.code === code);
  }

  async getConfigById(id: string): Promise<CodesConfigDto> {
    const configs = await this.getAllCodes();
    return configs.find((cfg) => cfg.id === id);
  }

  async getCodeById(id: string): Promise<string> {
    const configs = await this.getAllCodes();
    return configs.find((cfg) => cfg.id === id).code;
  }

  async getIdByCode(code: string): Promise<string> {
    const configs = await this.getAllCodes();
    return configs.find((cfg) => cfg.code === code).id;
  }

  async getManyCodesByIds(ids: string[]): Promise<Record<string, string>> {
    const configs = (await this.getAllCodes()).filter((c) =>
      ids.includes(c.id.toString()),
    );
    const codesConfigs = Object.fromEntries(
      configs.map((c) => [c.id.toString(), c.code]),
    );

    for (const id of ids) {
      if (!codesConfigs[String(id)])
        throw new Error(`Code not found for id  ${id}`);
    }

    return codesConfigs;
  }
  /** ✅ Filter items dynamically */
  async filterCodes(
    predicate: (item: CodesConfigDto) => boolean,
  ): Promise<CodesConfigDto[]> {
    const configs = await this.getAllCodes();
    return configs.filter(predicate);
  }

  async refreshCache() {
    await this.loadConfig();
  }
}
