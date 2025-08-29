import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('companyPayroll')
export class CompanyPayroll {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @Column({ type: 'uuid', name: 'createUser', nullable: true })
  createUser: string;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @Column({ type: 'uuid', name: 'updateUser', nullable: true })
  updateUser: string;

  @Column({ type: 'boolean', default: false, nullable: true })
  law1393: boolean;

  @Column({
    type: 'boolean',
    default: false,
    name: 'exoneratedCREE',
    nullable: true,
  })
  exoneratedCREE: boolean;

  @Column({
    type: 'boolean',
    default: false,
    name: 'affectAbsenteeLB',
    nullable: true,
  })
  affectAbsenteeLB: boolean;

  @Column({
    type: 'boolean',
    default: false,
    name: 'payday31vacation',
    nullable: true,
  })
  payday31vacation: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'assistanceType' })
  assistanceType: string;
}
