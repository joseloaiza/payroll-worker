import { Injectable } from '@nestjs/common';
import { RecurrentPaymentRepository } from './recurrent-payment.repository';
import { MovementsService } from './../../movements/movements.service';
import { Movement } from './../../movements/entities/movement.entity';

@Injectable()
export class RecurrentPaymentService {
  constructor(
    private readonly repo: RecurrentPaymentRepository,
    private readonly movementService: MovementsService,
  ) {}

  async processRecurrent(
    employee_id: string,
    company_id: string,
    period_id: string,
    period_year: number,
    period_month: number,
  ): Promise<Movement[]> {
    const novelties =
      await this.movementService.getMovementsNoveltiesTypeInPeriod(
        employee_id,
        company_id,
        period_id,
        'All',
      );

    const recurrentPayments = await this.repo.findActiveRecurrents(employee_id);
    const recurrentConceptIds = new Set(
      recurrentPayments.map((e) => e.concept_id),
    );
    const noveltyConceptIds = new Set(novelties.map((e) => e.concept_id));

    // Find concepts in recurrentPayments but not in novelties
    const conceptsToDelete = [...recurrentConceptIds].filter(
      (id) => !noveltyConceptIds.has(id),
    );

    // Remove outdated movements
    if (conceptsToDelete.length > 0) {
      await this.movementService.removeMovementsByConcepts(
        employee_id,
        company_id,
        period_id,
        conceptsToDelete,
      );

      // Add new movements for active recurrent payments
      recurrentPayments
        .filter((rp) => conceptsToDelete.includes(rp.concept_id) && rp.isActive)
        .map((rp) => ({
          employee_id: rp.employee_id,
          days: 0,
          value: Number(rp.value),
          concept_id: rp.concept_id,
        }));

      return await Promise.all(
        recurrentPayments.map((rp) => {
          return this.movementService.create({
            employee_id,
            quantity: 0,
            value: rp.value,
            concept_id: rp.concept_id,
            period_id,
            year: period_year,
            month: period_month,
            company_id,
          });
        }),
      );
    }
    return [];
  }
}
