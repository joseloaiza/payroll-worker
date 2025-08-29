import { AbstractEntity } from './../../database/abstract.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PeriodStatus } from './period-status.entity';
import { dateTransformer } from 'src/utils/date-utilities';

@Entity('period')
export class Period extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  number: number;

  @Column({ type: 'timestamp', transformer: dateTransformer })
  initialDate: Date;

  @Column({ type: 'timestamp', transformer: dateTransformer })
  endDate: Date;

  @Column()
  company_id: string;

  @ManyToOne(() => PeriodStatus)
  @JoinColumn({ name: 'periodStatus_id' })
  periodStatus: PeriodStatus;

  @Column()
  periodStatus_id: string;

  @Column({ nullable: true, length: 50 })
  description?: string;

  @Column()
  isActive: boolean;

  @Column({ nullable: true, type: 'int' })
  month?: number;
}
