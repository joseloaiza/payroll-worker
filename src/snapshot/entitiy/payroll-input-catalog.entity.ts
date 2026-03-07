import { Column, Entity } from 'typeorm';
import { PrimaryColumn } from 'typeorm/decorator/columns/PrimaryColumn.js';

@Entity('payroll_input_catalog')
export class PayrollInputCatalog {
  @PrimaryColumn({ name: 'input_code', length: 120 })
  inputCode: string;

  @Column({ name: 'input_group', length: 80 })
  inputGroup: string;

  @Column({ name: 'data_type', length: 20 })
  dataType: 'UUID' | 'TEXT' | 'NUMERIC' | 'DATE' | 'BOOLEAN' | 'JSON';

  @Column({ length: 255 })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
