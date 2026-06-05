import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Liquidation } from './entities/liquidation.entity';

@Injectable()
export class LiquidationRepository {
  constructor(
    @InjectRepository(Liquidation)
    private readonly repo: Repository<Liquidation>,
  ) {}

  create(partial: Partial<Liquidation>): Liquidation {
    return this.repo.create(partial);
  }

  async save(entity: Liquidation): Promise<Liquidation> {
    return this.repo.save(entity);
  }
}
