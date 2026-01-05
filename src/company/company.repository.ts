import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Company } from './entities/company.entity';

@Injectable()
export class CompanyRepository {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
  ) {}

  async getActiveCompanies(): Promise<Company[]> {
    return this.repo.find({ where: { isActive: true } });
  }

  async findOne(companyId: string): Promise<Company> {
    return this.repo.findOne({ where: { isActive: true, id: companyId } });
  }
}
