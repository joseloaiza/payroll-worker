export class PayrollJobDto {
  employeeId: string;
  companyId: string;
  period: {
    id: string;
    number: number;
    year: number;
    month: number;
    initialDate: Date;
    endDate: Date;
    isActive: boolean;
  };
}
