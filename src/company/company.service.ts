import { Injectable } from '@nestjs/common';
import { Company } from '../company/entities/company.entity';
import { CompanyRepository } from './company.repository';

@Injectable()
export class CompanyService {
  constructor(private readonly repo: CompanyRepository) {}

  async findActiveCompanies(): Promise<Company[]> {
    return await this.repo.getActiveCompanies();
  }

  async findOne(companyId: string): Promise<Company> {
    return await this.repo.findOne(companyId);
  }
}
