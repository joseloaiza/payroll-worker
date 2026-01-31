import { AbstractEntity } from './../../database/abstract.entity';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('employeeContract')
export class EmployeeContract extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employee_id: string;

  @Column()
  contractType_id: string;

  @Column()
  initialContractDate: Date;

  @Column()
  endContractDate: Date;

  @Column()
  isActive: boolean;

  @Column({ nullable: true })
  firstContractDate?: Date;
}
