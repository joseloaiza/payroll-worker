import { AbstractEntity } from './../../database/abstract.entity';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('solidarity')
export class Solidarity extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('numeric', { precision: 18, scale: 2, nullable: false })
  salaryMin: number;

  @Column('numeric', { precision: 18, scale: 2, nullable: false })
  salaryMax: number;

  @Column('numeric', { precision: 2, scale: 1, nullable: false })
  percentage: number;

  @Column('numeric', { precision: 2, scale: 1, nullable: false })
  perSolidarity?: number;

  @Column('numeric', { precision: 2, scale: 1, nullable: false })
  perSubsistence?: number;

  @Column({ nullable: true })
  isPensionary?: boolean;

  @Column({ nullable: true })
  isActive?: boolean;
}
