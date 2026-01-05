import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyPaymentRepository } from './comanyPayment.respository';
import { CompanyPayment } from '../entities/companyPayment.entity';

@Injectable()
export class CompanyPaymentService {
  constructor(private readonly repo: CompanyPaymentRepository) {}

  async findOne(id: string): Promise<CompanyPayment> {
    const entity = await this.repo.findOne(id, {
      relations: ['paymentFrequency'],
    });
    if (!entity) {
      throw new NotFoundException('CompanyPayroll not found');
    }
    return entity;
  }
}
