import { Injectable } from '@nestjs/common';
import { EmployeeRepository } from './employee.repository';
import { EmployeeFullView } from './entities/employee.view';
import { EmployeeContract } from './entities/employee-contract.entity';

@Injectable()
export class EmployeeService {
  constructor(private readonly repo: EmployeeRepository) {}

  async getEmployee(employeeId: string): Promise<EmployeeFullView> {
    return await this.repo.getEmployee(employeeId);
  }

  async getEmployeesCompany(company_id: string): Promise<EmployeeFullView[]> {
    const employees = await this.repo.getEmployeesCompany(company_id);
    return employees;
  }

  async getEmployeeIdsByCompany(companyId: string): Promise<string[]> {
    const employeeIds = await this.repo.getEmployeeIdsByCompany(companyId);
    return employeeIds;
  }

  async getContractsEmployee(employeeId: string): Promise<EmployeeContract[]> {
    const contracts = await this.repo.getContractsEmployee(employeeId);

    return contracts;
  }

  async getContractsInPeriod(
    employeeId,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<EmployeeContract[]> {
    const contracts = await this.repo.findContractsInPeriod(
      employeeId,
      periodStart,
      periodEnd,
    );

    return contracts;
  }

  async getInitialContract(employeeId: string): Promise<EmployeeContract> {
    const contract = await this.repo.getInitialContract(employeeId);
    return contract;
  }
}
