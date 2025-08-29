import { AbstractEntity } from './../../database/abstract.entity';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('concept')
export class Concept extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 5 })
  code: string;

  @Column({ length: 50 })
  description: string;

  @Column({ nullable: true })
  company_id?: string;

  @Column({ nullable: true, length: 50 })
  account?: string;

  @Column({ nullable: true, length: 50 })
  counterPart?: string;

  @Column({ nullable: true })
  salaryBase?: boolean;

  @Column({ nullable: true })
  securityBase?: boolean;

  @Column({ nullable: true })
  riskBase?: boolean;

  @Column({ nullable: true })
  parafiscalBase?: boolean;

  @Column({ nullable: true })
  retentionBase?: boolean;

  @Column({ nullable: true, length: 50 })
  conceptGroup?: string;

  @Column()
  isActive: boolean;

  @Column({ nullable: true })
  isCalculated?: boolean;

  @Column({ nullable: true })
  transportBase?: boolean;

  @Column({ nullable: true })
  isNovelty?: boolean;

  @Column({ nullable: true })
  isOverTime?: boolean;

  @Column({ nullable: true })
  absenteeType_id?: string;

  @Column({ nullable: true })
  primaLegalBase?: boolean;

  @Column({ nullable: true })
  isCustomer?: boolean;

  @Column({ nullable: true })
  severanceBase?: boolean;
}
