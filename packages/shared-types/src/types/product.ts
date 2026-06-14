export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  supplierId: string;
  price: number;
  quantity: number;
  reorderLevel: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedBy: string | null;
}

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

export interface CreateProductDto {
  name: string;
  sku: string;
  categoryId: string;
  supplierId: string;
  price: number;
  quantity: number;
  reorderLevel: number;
}
