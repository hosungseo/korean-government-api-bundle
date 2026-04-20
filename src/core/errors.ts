export class BundleError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "BundleError";
    this.code = code;
    this.details = details;
  }
}

export class InputError extends BundleError {
  constructor(message: string, details?: unknown) {
    super("INPUT_ERROR", message, details);
  }
}

export class ProviderError extends BundleError {
  constructor(message: string, details?: unknown) {
    super("PROVIDER_ERROR", message, details);
  }
}
