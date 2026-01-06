import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Employee } from './entities/employee.entity';
import { EmployeeFullView } from './entities/employee.view';

@Injectable()
export class EmployeeRepository {
  constructor(
    @InjectRepository(EmployeeFullView)
    private readonly repo: Repository<EmployeeFullView>,
    @InjectRepository(EmployeeFullView)
    private readonly employee_repo: Repository<Employee>,
  ) {}

  async getEmployee(employeeId: string): Promise<EmployeeFullView> {
    return this.repo.findOneBy({ employee_id: employeeId });
  }
  async getEmployeesCompany(company_id: string): Promise<EmployeeFullView[]> {
    const employees = await this.repo.find({
      where: { company_id: company_id },
    });

    return employees;
  }
}
