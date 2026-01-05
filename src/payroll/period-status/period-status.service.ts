import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { PeriodStatusRepository } from './period-status.repository';
import { ResponsePeriodStatusDto } from './../dtos/periodStatus.dto';

@Injectable()
export class PeriodStatusService {
  constructor(private readonly repo: PeriodStatusRepository) {}

  async periodStatus_by_code(code: string): Promise<ResponsePeriodStatusDto> {
    const entity = await this.repo.periodStatus_by_code(code);
    if (!entity) {
      throw new NotFoundException('Period status not found');
    }
    return plainToInstance(ResponsePeriodStatusDto, entity);
  }
}
