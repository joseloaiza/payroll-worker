import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyPayroll } from '../entities/company-payroll.entity';

@Injectable()
export class CompanyPayrollRepository {
  constructor(
    @InjectRepository(CompanyPayroll)
    private readonly repo: Repository<CompanyPayroll>,
  ) {}

  async findOne(id: string): Promise<CompanyPayroll> {
    return await this.repo.findOne({ where: { id: id } });
  }
}
