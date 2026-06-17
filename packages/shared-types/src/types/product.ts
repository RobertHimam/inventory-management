export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  sku: string;
  category: string;
  stockQuantity: number;
  isActive: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductListResponse {
  success: boolean;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductDetailResponse {
  success: boolean;
  data: Product;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  sku: string;
  category: string;
  stockQuantity?: number;
  isActive?: boolean;
}

export type UpdateProductDto = Partial<CreateProductDto>;

export interface Category {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedBy: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  contactEmail: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedBy: string | null;
}
