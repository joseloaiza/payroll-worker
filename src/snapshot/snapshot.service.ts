import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PayrollEmployeeSnapshot } from './entitiy/payroll_employee_snapshot.entity';
import { Repository } from 'typeorm';
import { PayrollInputCatalog } from './entitiy/payroll-input-catalog.entity';
import {
  INPUT_RESOLVERS,
  SnapshotContext,
} from './interface/snapshot-input.resolver';
import { PayrollEmployeeSnapshotInput } from './entitiy/payroll_employee_snapshot-input.entity';
import {
  IPeriod,
  PayrollContext,
} from 'src/payroll/interfaces/payroll.interfaces';

@Injectable()
export class SnapshotService {
  constructor(
    @InjectRepository(PayrollEmployeeSnapshot)
    private snapshotRepo: Repository<PayrollEmployeeSnapshot>,
    @InjectRepository(PayrollInputCatalog)
    private catalogRepo: Repository<PayrollInputCatalog>,
    // inject whatever repos you need to build SnapshotContext
    // private employeeJobRepo: Repository<EmployeeJob>,
    // private employeePaymentRepo: Repository<EmployeePayment>,
    // private periodRepo: Repository<Period>,
  ) {}

  async deleteSnapshotsForPeriod(
    companyId: string,
    employeeId: string,
    periodId: string,
  ) {
    await this.snapshotRepo.delete({
      company_id: companyId,
      employee_id: employeeId,
      period_id: periodId,
    });
  }

  async createSnapshot(
    companyId: string,
    employeeId: string,
    payrollContext: PayrollContext,
    period: IPeriod,
    periodId: string,
  ): Promise<PayrollEmployeeSnapshot> {
    // 1. Load active catalog entries
    const catalogEntries = await this.catalogRepo.find({
      where: { isActive: true },
    });

    // 2. Build context — load domain data ONCE
    // const [employeeJob, employeePayment, period] = await Promise.all([
    //   this.employeeJobRepo.findOneOrFail({ where: { employeeId } }),
    //   this.employeePaymentRepo.findOneOrFail({ where: { employeeId } }),
    //   this.periodRepo.findOneOrFail({ where: { id: periodId } }),
    // ]);

    const ctx: SnapshotContext = {
      employeeId,
      companyId,
      period,
      payroll: payrollContext,
    };

    // 3. Resolve inputs from catalog
    const inputs: PayrollEmployeeSnapshotInput[] = [];

    for (const catalog of catalogEntries) {
      const resolver = INPUT_RESOLVERS[catalog.inputCode];

      if (!resolver) {
        // Log a warning — catalog has an entry but no resolver implemented yet
        console.warn(`No resolver found for input_code: ${catalog.inputCode}`);
        continue;
      }

      const resolved = resolver(ctx);
      if (!resolved) continue;

      const input = new PayrollEmployeeSnapshotInput();
      input.input_code = catalog.inputCode;
      input.source_table = resolved.sourceTable;
      input.source_column = resolved.sourceColumn;
      input.input_label = resolved.inputLabel ?? catalog.description;
      Object.assign(input, resolved.value); // spreads value_uuid, value_numeric etc.

      inputs.push(input);
    }

    // 4. Persist everything in one shot
    const snapshot = this.snapshotRepo.create({
      company_id: companyId,
      employee_id: employeeId,
      period_id: periodId,
      inputs,
    });

    return this.snapshotRepo.save(snapshot);
  }
}
