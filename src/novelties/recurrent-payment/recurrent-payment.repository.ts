import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

import { RecurrentPayment } from './../entities/recurrent-payment.entity';

@Injectable()
export class RecurrentPaymentRepository {
  constructor(
    @InjectRepository(RecurrentPayment)
    private readonly repo: Repository<RecurrentPayment>,
  ) {}

  async findActiveRecurrents(employeeId: string): Promise<RecurrentPayment[]> {
    return this.repo.find({
      where: { employee_id: employeeId, isActive: true },
    });
  }
}
