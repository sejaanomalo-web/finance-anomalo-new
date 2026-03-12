export class HttpError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toErrorResponse(error) {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: {
        error: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  return {
    status: 500,
    body: {
      error: 'internal_error',
      message: 'Erro interno no servidor.',
    },
  };
}
