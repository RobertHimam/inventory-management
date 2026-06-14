export interface Event<T = unknown> {
  correlationId: string;
  timestamp: Date;
  type: string;
  version: string;
  payload: T;
}
