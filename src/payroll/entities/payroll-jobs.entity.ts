import { AbstractEntity } from './../../database/abstract.entity';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('payroll_jobs')
export class PayrollJob extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  periodId: string;

  @Column()
  totalEmployees: number;

  @Column({ default: 0 })
  processedCount: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
