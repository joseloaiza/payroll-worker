import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Concept } from './../entities/concept.entity';

@Injectable()
export class ConceptRepository {
  constructor(
    @InjectRepository(Concept)
    private readonly repo: Repository<Concept>,
  ) {}

  async getConceptsByCompany(companyId: string): Promise<Concept[]> {
    return await this.repo.findBy({ company_id: companyId });
  }
}
