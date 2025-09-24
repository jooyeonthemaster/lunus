// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 제품 가져오기 함수
export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id');
  
  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  
  return data;
}

// 카테고리별 제품 가져오기
export async function getProductsByCategory(category: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .order('id');
  
  if (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
  
  return data;
}

// 랜덤 제품 가져오기
export async function getRandomProduct() {
  const { data, error, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' });
  
  if (error || !count) {
    console.error('Error fetching random product:', error);
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * count);
  
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .range(randomIndex, randomIndex)
    .single();
  
  return product;
}