export interface IValidationError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  public statusCode: number;
  public errorCode: string;
  public validationErrors: IValidationError[];
  public data?: any;

  constructor(
    statusCode: number,
    message: string,
    errorCode = 'INTERNAL_ERROR',
    validationErrors: IValidationError[] = [],
    data?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.validationErrors = validationErrors;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, errorCode = 'BAD_REQUEST', errors: IValidationError[] = []): ApiError {
    return new ApiError(400, message, errorCode, errors);
  }

  static unauthorized(message = 'Unauthorized access.', errorCode = 'UNAUTHORIZED'): ApiError {
    return new ApiError(401, message, errorCode);
  }

  static forbidden(message = 'You do not have permission to perform this action.', errorCode = 'FORBIDDEN'): ApiError {
    return new ApiError(403, message, errorCode);
  }

  static notFound(message = 'Resource not found.', errorCode = 'NOT_FOUND'): ApiError {
    return new ApiError(404, message, errorCode);
  }

  static conflict(message: string, errorCode = 'CONFLICT', data?: any): ApiError {
    return new ApiError(409, message, errorCode, [], data);
  }

  static internal(message = 'Internal server error occurred.', errorCode = 'INTERNAL_SERVER_ERROR'): ApiError {
    return new ApiError(500, message, errorCode);
  }
}
