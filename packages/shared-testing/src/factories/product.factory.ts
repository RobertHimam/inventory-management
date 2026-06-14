export interface ProductData {
  id?: string;
  name: string;
  sku: string;
  categoryId: string;
  price: number;
  quantity: number;
  reorderLevel: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  price: number;
  quantity: number;
  reorderLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

export const createProduct = (data: ProductData): Product => {
  return {
    id: data.id || 'prod-' + Math.random().toString(36).substr(2, 9),
    name: data.name,
    sku: data.sku,
    categoryId: data.categoryId,
    price: data.price,
    quantity: data.quantity,
    reorderLevel: data.reorderLevel,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};
