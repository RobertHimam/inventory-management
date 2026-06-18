export interface Supplier {
  _id: string
  name: string
  contactEmail?: string
  phone?: string
  address?: string
  deletedAt: Date | null
  deletedBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateSupplierDto {
  name: string
  contactEmail?: string
  phone?: string
  address?: string
}

export interface UpdateSupplierDto {
  name?: string
  contactEmail?: string
  phone?: string
  address?: string
}

export interface SupplierQueryParams {
  page?: number
  limit?: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}

export interface SupplierListResponse {
  success: boolean
  data: Supplier[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface SupplierDetailResponse {
  success: boolean
  data: Supplier
}
