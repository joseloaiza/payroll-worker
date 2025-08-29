export class ConceptDto {
  id: string;
  code?: string;
  description?: string;
  company_id?: string;
  account?: string;
  counterPart?: string;
  salaryBase?: boolean;
  securityBase?: boolean;
  riskBase?: boolean;
  parafiscalBase: boolean;
  retentionBase?: boolean;
  transportBase?: boolean;
  primaLegalBase?: boolean;
  severanceBase?: boolean;
  conceptGroup?: string;
  isActive?: boolean;
  isCalculated?: boolean;
  isNovelty?: boolean;
  isOverTime?: boolean;
  absenteeType_id?: string;
  isCustomer?: boolean;
}
