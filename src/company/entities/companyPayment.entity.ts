import { PaymentFrequency } from './paymentFrequency.entity';
import { AbstractEntity } from './../../database/abstract.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('companyPayment')
export class CompanyPayment extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PaymentFrequency)
  @JoinColumn({ name: 'paymentFrequency_id' })
  paymentFrequency?: PaymentFrequency;

  @Column({ nullable: true })
  paymentMethod_id?: string;

  @Column({ nullable: true })
  bank_id?: string;

  @Column({ nullable: true })
  accountType_id?: string;

  @Column({ nullable: true })
  accountNumber?: string;
}
