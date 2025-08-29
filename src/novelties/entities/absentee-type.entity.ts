import { AbstractEntity } from './../../database/abstract.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { AbsenteeHistory } from './absenteeHistory.entity';

@Entity('absenteeType')
export class AbsenteeType extends AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  affectsAntiquity?: boolean;

  @OneToMany(() => AbsenteeHistory, (absentee) => absentee.absenteeType)
  absences: AbsenteeHistory[];
}
