export interface PaginatedMeta {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PaginatedResult<T> extends PaginatedMeta {
  items: T[];
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  q?: string;
}
