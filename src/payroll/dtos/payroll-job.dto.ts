export class CreatePayrollJobdDto {
  companyId: string;
  periodId: string;
  totalEmployees: number;
  processedCount?: number;
  failedCount?: number;
  status?: 'processing' | 'completed' | 'completed_with_errors' | 'failed';
  type?: string;
  cause_liquidation_id?: string;
  periodData: {
    id: string;
    number: number;
    year: number;
    month: number;
    initialDate: Date;
    endDate: Date;
    isActive: boolean;
    previousPeriodYear: number;
    previousPeriodNumber: number;
  };
}
