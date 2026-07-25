export interface ApiError {
  status: number;
  error: string;
  message: string;
  fieldErrors?: Record<string, string>;
  timestamp: string;
}

export class ApiClientError extends Error {
  status: number;
  apiError?: ApiError;
  /** パース済みのレスポンスボディ。ApiError 以外の形で返るエラー（409 の競合など）用。 */
  body?: unknown;

  constructor(status: number, apiError?: ApiError, body?: unknown) {
    super(apiError?.message ?? `HTTP ${status}`);
    this.name = 'ApiClientError';
    this.status = status;
    this.apiError = apiError;
    this.body = body;
  }
}