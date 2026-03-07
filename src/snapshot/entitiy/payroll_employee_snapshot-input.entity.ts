import { AbstractEntity } from '../../database/abstract.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PayrollEmployeeSnapshot } from './payroll_employee_snapshot.entity';

@Entity('payroll_employee_snapshot_input')
export class PayrollEmployeeSnapshotInput extends AbstractEntity {
  @Column({ type: 'uuid' })
  snapshot_id: string;
  @Column({ length: 100 })
  source_table: string;
  @Column({ length: 100 })
  source_column: string;
  @Column({ length: 120 })
  input_code: string;
  @Column({ nullable: true, length: 255 })
  input_label?: string;
  @Column({ nullable: true, precision: 18, scale: 6 })
  value_numeric?: number;
  @Column({ nullable: true, length: 255 })
  value_text?: string;
  @Column({ nullable: true })
  value_date?: Date;
  @Column({ nullable: true })
  value_boolean?: boolean;
  @Column({ nullable: true, type: 'uuid' })
  value_uuid?: string;
  @Column({ nullable: true, type: 'jsonb' })
  value_json?: object;

  @ManyToOne(() => PayrollEmployeeSnapshot, (s) => s.inputs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'snapshot_id' })
  snapshot: PayrollEmployeeSnapshot;
}
