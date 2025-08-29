import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConceptRepository } from './concepts.repository';
import { Concept } from '../entities/concept.entity';

@Injectable()
export class ConceptsService {
  constructor(
    // @Inject(CACHE_MANAGER)
    // private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly repo: ConceptRepository,
  ) {}

  async getConcepts(companyId: string): Promise<{
    concepts: Concept[];
    conceptMap: Map<string, string>;
  }> {
    const cacheKey = `concepts-${companyId}`;
    try {
      // const cachedData = await this.cacheManager.get<{
      //   concepts: Concept[];
      //   conceptMap: Map<string, string>;
      // }>(cacheKey);

      // if (cachedData) {
      //   // Convert the serialized conceptMap back to a Map
      //   const conceptMap = new Map(Object.entries(cachedData.conceptMap));
      //   return {
      //     concepts: cachedData.concepts,
      //     conceptMap: conceptMap,
      //   };
      // }

      const concepts = await this.repo.getConceptsByCompany(companyId);
      const conceptMap: Map<string, string> = new Map(
        concepts.map((c) => [c.code, c.id]),
      );

      const cacheData = {
        concepts,
        conceptMap: Object.fromEntries(conceptMap),
      };

      //await this.cacheManager.set(cacheKey, cacheData);

      return { concepts, conceptMap };
    } catch (error) {
      this.logger.error('Failed to get company concepts', error.stack);
      throw error;
    }
  }
}
