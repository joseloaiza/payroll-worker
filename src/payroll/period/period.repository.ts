import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreatePeriodDto, UpdatePeriodDto } from './../dtos/period.dto';
import { BaseRepository } from '../../database/base.repository';
import { Period } from '../entities/period.entity';

@Injectable()
export class PeriodRepository extends BaseRepository<
  Period,
  CreatePeriodDto,
  UpdatePeriodDto
> {
  constructor(
    @InjectRepository(Period)
    repo: Repository<Period>,
  ) {
    super(repo);
  }

  async find_period_by_status(
    status: string,
    year: number,
    company_id: string,
  ): Promise<Period> {
    try {
      const period = await this.repo.findOne({
        where: {
          year,
          company_id,
          periodStatus: {
            code: status,
          },
        },
        relations: ['periodStatus'],
      });

      return period;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new InternalServerErrorException('Error fetching Period');
    }
  }

  async getLastPeriod(year: number, periodNumber: number): Promise<Period> {
    if (periodNumber == 1) {
      // Case 1: last period of previous year

      return await this.repo
        .createQueryBuilder('p')
        .where('p.year = :prevYear', { prevYear: year - 1 })
        .orderBy('p.number', 'DESC')
        .getOne();
    } else {
      // Case 2: previous period in the same year
      return await this.repo.findOne({
        where: {
          year: year,
          number: periodNumber - 1,
        },
      });
    }
  }
}
