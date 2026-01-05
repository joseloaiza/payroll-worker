import { AbstractEntity } from './../../database/abstract.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from './../../company/entities/company.entity';

@Entity('employee')
export class Employee extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  company_id: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column()
  identificationType_id: string;

  @Column({ length: 50 })
  identification: string;

  @Column({ length: 50 })
  firstName: string;

  @Column({ nullable: true, length: 50 })
  secondName?: string;

  @Column({ length: 50 })
  surname: string;

  @Column({ nullable: true, length: 50 })
  secondSurName?: string;

  @Column({ nullable: true })
  birthDate?: Date;

  @Column()
  gender_id?: string;

  @Column()
  city_id?: string;

  @Column()
  state_id?: string;

  @Column()
  country_id?: string;

  @Column({ nullable: true, length: 50 })
  address?: string;

  @Column({ nullable: true, length: 50 })
  phone?: string;

  @Column({ nullable: true, length: 50 })
  cellPhone?: string;

  @Column({ nullable: true, length: 150 })
  img?: string;

  @Column({ nullable: true, length: 100 })
  email?: string;

  @Column()
  isActive: boolean;
}
