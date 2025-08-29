import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Solidarity } from './entities/solidarity.entity';

@Injectable()
export class SolidarityRepository {
  constructor(
    @InjectRepository(Solidarity)
    private readonly repo: Repository<Solidarity>,
  ) {}

  async getPercentageBySalaryRange(
    salary: number,
    isPensionary: boolean,
  ): Promise<Solidarity | null> {
    return await this.repo.findOne({
      where: {
        salaryMin: LessThanOrEqual(salary), // Salary should be >= salaryMin
        salaryMax: MoreThanOrEqual(salary), // Salary should be <= salaryMax
        isPensionary,
      },
      select: ['id', 'percentage', 'perSolidarity', 'perSubsistence'],
    });
  }
}
