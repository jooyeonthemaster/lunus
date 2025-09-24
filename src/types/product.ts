// types/product.ts

export interface Product {
  id?: number;
  name: string;
  imageUrl: string;
  price: number;
  priceText: string;
  category: string;
  brand: string;
  productUrl: string;
  description?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ScrapeResult {
  success: boolean;
  message: string;
  products?: Product[];
  error?: string;
}

export interface CategoryResult extends ScrapeResult {
  category: string;
}