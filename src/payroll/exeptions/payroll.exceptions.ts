export class PayrollCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayrollCalculationError';
    // Maintain proper stack trace (only needed if targeting ES5)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PayrollCalculationError);
    }
  }
}

export class PayrollValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayrollValidationError';
    // Maintain proper stack trace (only needed if targeting ES5)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PayrollValidationError);
    }
  }
}

// You can add more payroll-specific exceptions here as needed
export class PayrollNotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayrollNotFoundException';
  }
}
