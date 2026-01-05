import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanyPayment } from '../entities/companyPayment.entity';
import { BaseRepository } from 'src/database/base.repository';
import {
  CreateCompanyPaymentDto,
  UpdateCompanyPaymentDto,
} from '../dtos/companyPayment.dto';

@Injectable()
export class CompanyPaymentRepository extends BaseRepository<
  CompanyPayment,
  CreateCompanyPaymentDto,
  UpdateCompanyPaymentDto
> {
  constructor(
    @InjectRepository(CompanyPayment)
    repo: Repository<CompanyPayment>,
  ) {
    super(repo);
  }
}
