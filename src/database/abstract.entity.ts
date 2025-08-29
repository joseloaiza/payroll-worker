import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export class AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
  @Column({ name: 'createUser', type: 'varchar', length: 50, nullable: true })
  createUser?: string;
  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
  @Column({ name: 'updateUser', type: 'varchar', length: 50, nullable: true })
  updateUser?: string;
}
