import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EmployeeService } from '../../employee/employee.service';
import {
  Contract,
  IPeriod,
  PayrollContext,
} from '../interfaces/payroll.interfaces';
import { PayrollValidationError } from '../exeptions/payroll.exceptions';
import { getRealEndDatePeriod } from '../helpers/payrollHelpers';

@Injectable()
export class PayrollContextBuilderService {
  constructor(
    private readonly employeeService: EmployeeService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async build(
    employeeId: string,
    companyId: string,
    period: IPeriod,
  ): Promise<PayrollContext> {
    const employee = await this.employeeService.getEmployee(employeeId);

    if (!employee) {
      this.logger.error(`Build Context:Employee ${employeeId} not foud`);
      throw new PayrollValidationError('El empleado no existe en el sistema');
    }

    if (employee.endSalaryDate < period.initialDate) {
      this.logger.error(
        `Build Context:Employee Salary for ${employeeId} not foud`,
      );
      throw new PayrollValidationError(
        'Empleado no tiene datos de salario vigente.',
      );
    }

    const realEndDatePeriod = getRealEndDatePeriod(period.endDate);

    const contractsInperiod = await this.employeeService.getContractsInPeriod(
      employeeId,
      period.initialDate,
      period.endDate,
    );
    if (!contractsInperiod || contractsInperiod.length === 0) {
      this.logger.error(`Build Context:Employee ${employeeId} not foud`);
      throw new PayrollValidationError('Empleado no tiene datos de contrato');
    }

    const initialContract =
      await this.employeeService.getInitialContract(employeeId);

    const periodContracts: Contract[] = contractsInperiod.map((contract) => ({
      initialContractDate: contract.initialContractDate,
      endContractDate: contract.endContractDate ?? null,
      classification: contract.contractType_id,
    }));

    const initialContractData: Contract = {
      initialContractDate: initialContract.initialContractDate,
      endContractDate: initialContract.endContractDate ?? null,
      classification: initialContract.contractType_id,
    };

    return {
      employeeId,
      companyId,
      period,
      realEndDatePeriod,
      totalWorkindays: 0,
      totalAbseenteDays: 0,
      rawSalary: 0,
      excess1393: 0,
      totalBaseCree: 0,
      ibcSocialSecurity: 0,
      vacationHistory: employee.vacationHistory,
      salaryData: {
        salary: employee.salary,
        salaryTypeCode: employee.salaryTypeCode,
        variableSalary: employee.variableSalary,
      },
      contractData: {
        regimeCode: employee.codeContractRegime,
        contributorTypeCode: employee.codeContributorType,
        riskPercentage: employee.percentageWorkPlaceRisks,
        transportAssistance: employee.transportAssistance,
        variableSalary: employee.variableSalary,
        contractsInPeriod: periodContracts,
        initialContract: initialContractData,
      },
      employeeContext: employee,
    };
  }
}
