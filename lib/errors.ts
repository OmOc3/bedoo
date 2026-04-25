export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;

  public constructor(message: string, code: string, status = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function toAppError(error: unknown, fallbackMessage: string, fallbackCode: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return new AppError(error.message, fallbackCode);
  }

  return new AppError(fallbackMessage, fallbackCode);
}
