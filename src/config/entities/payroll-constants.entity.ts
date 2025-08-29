import { IsNumber, Min } from 'class-validator';
import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('payrollConstants')
export class PayrollConstants {
  @PrimaryColumn()
  id: string;
  @Column({ length: 50 })
  description: string;

  @Column({
    type: 'numeric',
    precision: 18,
    scale: 2,
    nullable: false,
  })
  @IsNumber()
  @Min(0) // Ensures the value is not negative
  value: number;

  @Column({ nullable: true })
  initialDate?: Date;

  @Column({ nullable: true })
  endDate?: Date;

  @Column()
  isActive: boolean;

  @Column({ length: 20 })
  type: string;
}
