export class ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  metadata?: {
    wordCount?: number;
    characterCount?: number;
    readabilityScore?: number;
    containsProfanity?: boolean;
    containsPersonalInfo?: boolean;
    qualityScore?: number;
  };

  constructor(isValid: boolean, errors: string[] = [], warnings: string[] = []) {
    this.isValid = isValid;
    this.errors = errors;
    this.warnings = warnings;
  }

  static valid(warnings: string[] = [], metadata?: any): ValidationResult {
    const result = new ValidationResult(true, [], warnings);
    if (metadata) {
      result.metadata = metadata;
    }
    return result;
  }

  static invalid(errors: string[], warnings: string[] = []): ValidationResult {
    return new ValidationResult(false, errors, warnings);
  }

  addError(error: string): void {
    this.errors.push(error);
    this.isValid = false;
  }

  addWarning(warning: string): void {
    if (!this.warnings) {
      this.warnings = [];
    }
    this.warnings.push(warning);
  }
}
