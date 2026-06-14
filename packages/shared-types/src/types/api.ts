export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: Pagination;
}

export interface BaseEvent {
  correlationId: string;
  timestamp: Date;
  version: string;
  type: string;
  payload: unknown;
}
