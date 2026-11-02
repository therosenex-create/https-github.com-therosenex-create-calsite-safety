export class AppError extends Error {
  constructor(
    public code: string,
    public field?: string,
  ) {
    super(code);
    this.name = "AppError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
