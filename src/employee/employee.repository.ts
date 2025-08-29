import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { EmployeeFullView } from './entities/employee.view';

@Injectable()
export class EmployeeRepository {
  constructor(
    @InjectRepository(EmployeeFullView)
    private readonly repo: Repository<EmployeeFullView>,
  ) {}

  async getEmployee(employeeId: string): Promise<EmployeeFullView> {
    return this.repo.findOneBy({ employee_id: employeeId });
  }
}
