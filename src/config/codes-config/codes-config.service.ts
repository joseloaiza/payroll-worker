import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
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
export class CodesConfigService implements OnModuleInit {
  private readonly cacheKey = 'codes_config:all';
  private readonly logger = new Logger(CodesConfigService.name);
  constructor(
    @InjectRepository(CodesConfig)
    private readonly repository: Repository<CodesConfig>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}
  async onModuleInit() {
    try {
      await this.loadConfig();
      this.logger.log('Codes config loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load codes config ', error.stack);
    }
  }

  async loadConfig() {
    try {
      const codes = await this.repository.find();
      const plainConfigs: CodesConfigDto[] = codes.map((c) => ({
        id: c.id,
        code: c.code,
        description: c.description,
        category: c.category,
      }));

      await this.cacheManager.set(this.cacheKey, plainConfigs, 36000); // 1 hour TTL
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /** ✅ Get all codes */
  async getAllCodes(): Promise<CodesConfigDto[]> {
    const cache = await this.cacheManager.get<CodesConfigDto[]>(this.cacheKey);
    if (cache) return cache;
    const codes = await this.repository.find();
    const plainConfigs: CodesConfigDto[] = codes.map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      category: c.category,
    }));

    await this.cacheManager.set(this.cacheKey, plainConfigs, 36000); // 1 hour TTL
    return plainConfigs;
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
  // async getManyCodesByIds(ids: string[]): Promise<string[]> {
  //   const configs = await this.getAllCodes();
  //   const filter_configs = configs.filter((obj) =>
  //     ids.includes(obj.id.toString()),
  //   );
  //   return filter_configs.map((obj) => obj.code);
  // }
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
