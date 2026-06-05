export interface ProvisionLineItem {
  days: number;
  value: number;
  code: string;
}

export interface UnemploymentCalculationData {
  items: ProvisionLineItem[];
  unpaidValue: number;
}

export interface InterestUnemploymentCalculationData {
  items: ProvisionLineItem[];
}

export interface VacationCalculationData {
  items: ProvisionLineItem[];
}

export interface BonusPaymentCalculationData {
  items: ProvisionLineItem[];
}
