import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Period } from './../entities/period.entity';
import { CreatePeriodDto, ResponsePeriodDto } from '../dtos/period.dto';
import { PeriodRepository } from './period.repository';
import { CompanyPaymentService } from './../../company/company-payment/company-payment.service';
import { PeriodStatusService } from './../period-status/period-status.service';

@Injectable()
export class PeriodService {
  constructor(
    private readonly companyPaymentService: CompanyPaymentService,
    private readonly periodStatusService: PeriodStatusService,
    private readonly repo: PeriodRepository,
  ) {}

  async findOne(id: string): Promise<ResponsePeriodDto> {
    const entity = await this.repo.findOne(id);
    if (!entity) {
      throw new NotFoundException('Period not found..');
    }
    return plainToInstance(ResponsePeriodDto, entity);
  }

  private async create(
    companyId: string,
    currentYear: number,
    currentMonth: number,
    currentDay: number,
    daysInMonth: number,
  ): Promise<Period> {
    let periodNumber: number;
    let initialDate: Date;
    let endDate: Date;

    try {
      // Get company payment attributes
      const companyPayment =
        await this.companyPaymentService.findOne(companyId);
      if (!companyPayment) {
        throw new Error(
          `Company payment data not found for company ${companyId}`,
        );
      }

      console.log(
        `company payment frecuency  ${companyPayment.paymentFrequency.code}`,
      );

      // Determine payment frequency
      if (companyPayment.paymentFrequency.code === 'Q') {
        if (currentDay <= 15) {
          periodNumber = currentMonth * 2 - 1;
          initialDate = new Date(currentYear, currentMonth - 1, 1);
          endDate = new Date(currentYear, currentMonth - 1, 15);
        } else {
          periodNumber = currentMonth * 2;
          initialDate = new Date(currentYear, currentMonth - 1, 16);
          endDate = new Date(currentYear, currentMonth - 1, daysInMonth);
        }
      } else {
        periodNumber = currentMonth;
        initialDate = new Date(currentYear, currentMonth - 1, 1);
        endDate = new Date(currentYear, currentMonth - 1, daysInMonth);
      }

      // Get the period status
      const periodStatus =
        await this.periodStatusService.periodStatus_by_code('PR');

      if (!periodStatus) {
        throw new Error(`Period status 'PR' not found`);
      }

      const period = {
        year: currentYear,
        number: periodNumber, // Increment period number
        initialDate: initialDate,
        endDate: endDate,
        company_id: companyId,
        periodStatus_id: periodStatus.id, // Replace with real status logic
        description: periodStatus.description,
        isActive: true,
        month: currentMonth,
      };

      const dto = plainToInstance(CreatePeriodDto, period);
      return await this.repo.create(dto);
    } catch (error) {
      throw error;
    }
  }

  async find_period_by_status(
    status: string,
    year: number,
    company_id: string,
  ) {
    return await this.repo.find_period_by_status(status, year, company_id);
  }

  async get_period_on_process(
    companyId: string,
    year: number,
  ): Promise<ResponsePeriodDto> {
    const localDate = new Date(); // Current date
    const currentYear = localDate.getFullYear();
    const currentMonth = localDate.getMonth() + 1; // Months are 0-based
    const currentDay = localDate.getDate();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate(); // Get days in current month

    try {
      // Find the most recent period for the given company and year
      const periodInProcess = await this.repo.find_period_by_status(
        'PR',
        year,
        companyId,
      );

      const isPastPeriod =
        !periodInProcess || localDate > periodInProcess.endDate;
      console.log(`Create new period ${isPastPeriod}`);

      const resultPeriod = isPastPeriod
        ? await this.create(
            companyId,
            currentYear,
            currentMonth,
            currentDay,
            daysInMonth,
          )
        : periodInProcess;

      return plainToInstance(ResponsePeriodDto, resultPeriod);
    } catch (error) {
      throw error;
    }
  }

  async getLastPeriod(
    year: number,
    periodNumber: number,
  ): Promise<ResponsePeriodDto> {
    const entity = await this.repo.getLastPeriod(year, periodNumber);
    if (!entity) {
      throw new NotFoundException('Period not found');
    }
    return plainToInstance(ResponsePeriodDto, entity);
  }
}
