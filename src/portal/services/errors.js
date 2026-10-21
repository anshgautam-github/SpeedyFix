/** Every service call rejects with a ServiceError so screens can show a clear message and decide on retries. */
export class ServiceError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.details = details;
  }
}
export const isUnauthenticated = (e) => e?.code === 'UNAUTHENTICATED';
