import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { PeriodStatus } from './../entities/period-status.entity';

@Injectable()
export class PeriodStatusRepository {
  constructor(
    @InjectRepository(PeriodStatus)
    private readonly repo: Repository<PeriodStatus>,
  ) {}

  async periodStatus_by_code(code: string) {
    return this.repo.findOne({ where: { code: code } });
  }
}
