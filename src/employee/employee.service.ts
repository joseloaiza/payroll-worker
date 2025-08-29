import { Injectable } from '@nestjs/common';
import { EmployeeRepository } from './employee.repository';
import { EmployeeFullView } from './entities/employee.view';

@Injectable()
export class EmployeeService {
  constructor(private readonly repo: EmployeeRepository) {}

  async getEmployee(employeeId: string): Promise<EmployeeFullView> {
    return await this.repo.getEmployee(employeeId);
  }
}
