export interface Category {
  _id: string
  name: string
  description?: string
  deletedAt: Date | null
  deletedBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateCategoryDto {
  name: string
  description?: string
}

export interface UpdateCategoryDto {
  name?: string
  description?: string
}

export interface CategoryQueryParams {
  page?: number
  limit?: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export interface CategoryListResponse {
  success: boolean
  data: Category[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CategoryDetailResponse {
  success: boolean
  data: Category
}
