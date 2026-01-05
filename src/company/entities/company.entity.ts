import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('company')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  identification: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  verificationNumber: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  city_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  legalRepresentant: string;

  @Column({ type: 'date', nullable: true })
  fundationDate: Date;

  @Column({ type: 'uuid', nullable: true })
  entityRisks_id: string;

  @Column({ type: 'uuid', nullable: true })
  compensationFund_id: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  img: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  state_id: string;

  @Column({ type: 'uuid', nullable: true })
  country_id: string;

  @Column({ type: 'uuid', nullable: true })
  identificationType_id: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cellphone: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @Column({ name: 'createUser', type: 'varchar', length: 50, nullable: true })
  createUser: string;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @Column({ name: 'updateUser', type: 'varchar', length: 50, nullable: true })
  updateUser: string;
}
