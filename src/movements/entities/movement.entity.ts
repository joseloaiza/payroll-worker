import { Concept } from 'src/payroll/entities/concept.entity';
import { AbstractEntity } from './../../database/abstract.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Period } from 'src/payroll/entities/period.entity';
import { Employee } from 'src/employee/entities/employee.entity';

@Entity('movement')
export class Movement extends AbstractEntity {
  @Column()
  employee_id: string;

  @Column()
  period_id: string;

  @Column()
  concept_id: string;

  @Column({ nullable: true })
  quantity?: number;

  @Column({ nullable: true })
  value?: number;

  @Column({ nullable: true })
  year?: number;

  @Column({ nullable: true })
  month?: number;

  @Column({ nullable: true })
  company_id?: string;

  /** ✅ Establish relationship with `Concept` entity */
  @ManyToOne(() => Concept)
  @JoinColumn({ name: 'concept_id' }) // ✅ Links `concept_id` column
  concept?: Concept;

  @ManyToOne(() => Period)
  @JoinColumn({ name: 'period_id' }) // ✅ Links `period_id` column
  period?: Period;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}
