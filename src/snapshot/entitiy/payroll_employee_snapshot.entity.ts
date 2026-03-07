import { AbstractEntity } from '../../database/abstract.entity';
import { Entity, Column, OneToMany } from 'typeorm';
import { PayrollEmployeeSnapshotInput } from './payroll_employee_snapshot-input.entity';

@Entity('payroll_employee_snapshot')
export class PayrollEmployeeSnapshot extends AbstractEntity {
  @Column({ length: 5 })
  company_id: string;

  @Column({ length: 50 })
  employee_id: string;

  @Column()
  period_id: string;

  @OneToMany(() => PayrollEmployeeSnapshotInput, (i) => i.snapshot, {
    cascade: true,
  })
  inputs: PayrollEmployeeSnapshotInput[];
}
