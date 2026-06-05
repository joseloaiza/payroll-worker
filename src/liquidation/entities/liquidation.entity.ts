import { AbstractEntity } from 'src/database/abstract.entity';
import { Entity, Column } from 'typeorm';

@Entity('liquidation')
export class Liquidation extends AbstractEntity {
  @Column()
  employee_id: string;

  @Column()
  company_id: string;

  @Column()
  period_id: string;

  @Column({ type: 'timestamp' })
  termination_date: Date;

  @Column({ nullable: true })
  cause_liquidation_id?: string;

  @Column({ nullable: true, length: 50 })
  type?: string;
}
