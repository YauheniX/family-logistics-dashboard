/**
 * API Response Types
 */
export interface ApiResponse<T = unknown> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * Repository interface - defines contract for data access
 */
export interface Repository<TEntity, TCreateDto = Partial<TEntity>, TUpdateDto = Partial<TEntity>> {
  findAll(): Promise<ApiResponse<TEntity[]>>;
  findById(id: string): Promise<ApiResponse<TEntity>>;
  create(dto: TCreateDto): Promise<ApiResponse<TEntity>>;
  update(id: string, dto: TUpdateDto): Promise<ApiResponse<TEntity>>;
  delete(id: string): Promise<ApiResponse<void>>;
}

/**
 * Query builder helper types
 */
// We keep this intentionally permissive because table typings may vary
// depending on whether the project is running against mock/local/remote schemas.
// Repository implementations cast the builder to the right shape at call sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueryBuilder = (builder: any) => any;
