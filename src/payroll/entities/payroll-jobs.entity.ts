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

  @Column({ default: 0 })
  failedCount: number;

  @Column({ default: 'processing' })
  status: 'processing' | 'completed' | 'completed_with_errors' | 'failed';

  // ✅ Add this column to store period data
  @Column({ type: 'jsonb' }) // Use 'json' if not using PostgreSQL
  periodData: {
    id: string;
    number: number;
    year: number;
    month: number;
    initialDate: Date;
    endDate: Date;
    isActive: boolean;
    previousPeriodYear: number;
    previousPeriodNumber: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  employeeResults: Record<
    string,
    {
      status: string;
      error?: string;
      completedAt: Date;
    }
  >;

  @Column({ nullable: true })
  completedAt: Date;
}
