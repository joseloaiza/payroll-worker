import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('codes_config')
export class CodesConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  code: string;

  @Column()
  description: string;

  @Column({ nullable: true, length: 50 })
  category?: string;
}
