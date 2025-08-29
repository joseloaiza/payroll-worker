import {
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Entity,
} from 'typeorm';
import { Concept } from '../../payroll/entities/concept.entity';
import { Employee } from '../../employee/entities/employee.entity';
import { AbstractEntity } from 'src/database/abstract.entity';

@Entity('recurrentPayment')
export class RecurrentPayment extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  employee_id?: string;

  @Column()
  concept_id: string;

  @Column({ nullable: true, precision: 18, scale: 2 })
  value?: number;

  @Column()
  isActive: boolean;

  @ManyToOne(() => Concept)
  @JoinColumn({ name: 'concept_id' })
  concept: Concept;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;
}
