import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

import { EmployeeFullView } from './entities/employee.view';
import { EmployeeContract } from './entities/employee-contract.entity';

@Injectable()
export class EmployeeRepository {
  constructor(
    @InjectRepository(EmployeeFullView)
    private readonly repo: Repository<EmployeeFullView>,
    @InjectRepository(EmployeeContract)
    private readonly contract_repo: Repository<EmployeeContract>,
  ) {}

  async getEmployee(employeeId: string): Promise<EmployeeFullView> {
    return this.repo
      .createQueryBuilder('employee')
      .where('employee.employee_id = :employeeId', { employeeId })
      .orderBy('employee.endSalaryDate', 'DESC')
      .limit(1)
      .getOne();
    //return this.repo.findOneBy({ employee_id: employeeId });
  }
  async getEmployeesCompany(company_id: string): Promise<EmployeeFullView[]> {
    const employees = await this.repo.find({
      where: { company_id: company_id },
    });

    return employees;
  }

  async getEmployeeIdsByCompany(companyId: string): Promise<string[]> {
    const result = await this.repo
      .createQueryBuilder('employee')
      .select('employee.employee_id')
      .where('employee.company_id = :companyId', { companyId })
      .getMany();

    return result.map((e) => e.employee_id);
  }

  async getContractsEmployee(employeeId: string): Promise<EmployeeContract[]> {
    const contracts = await this.contract_repo.find({
      where: { employee_id: employeeId },
    });

    return contracts;
  }

  async findContractsInPeriod(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<EmployeeContract[]> {
    return this.contract_repo
      .createQueryBuilder('c')
      .where('c.employee_id = :employeeId', { employeeId })
      .andWhere('c.initialContractDate <= :periodEnd', { periodEnd })
      .andWhere(
        '(c.endContractDate IS NULL OR c.endContractDate >= :periodStart)',
        { periodStart },
      )
      .orderBy('c.initialContractDate', 'ASC')
      .getMany();
  }
  async getInitialContract(employeeId: string): Promise<EmployeeContract> {
    return this.contract_repo
      .createQueryBuilder('c')
      .where('c.employee_id = :employeeId', { employeeId })
      .orderBy('c.initialContractDate', 'ASC')
      .getOne();
  }
}
