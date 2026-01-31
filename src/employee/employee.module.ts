import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { Employee } from './entities/employee.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeRepository } from './employee.repository';
import { EmployeeFullView } from './entities/employee.view';
import { EmployeeContract } from './entities/employee-contract.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, EmployeeFullView, EmployeeContract]),
  ],
  providers: [EmployeeService, EmployeeRepository],
  exports: [EmployeeService, EmployeeRepository],
})
export class EmployeeModule {}
