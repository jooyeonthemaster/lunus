// scripts/scrape-iloom.js
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function scrapeCategory(categoryName, categoryNo) {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    const url = `https://www.iloom.com/product/list.do?categoryNo=${categoryNo}`;
    
    console.log(`[${categoryName}] 크롤링 시작: ${url}`);
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    const products = await page.evaluate(() => {
      const productList = [];
      const allImages = document.querySelectorAll('img');
      
      allImages.forEach((img) => {
        if (img.src && img.src.includes('/upload/product/') && img.src.includes('.jpg')) {
          let parent = img.parentElement;
          let depth = 0;
          let productInfo = {
            imageUrl: img.src,
            name: img.alt || '',
            price: '',
            productUrl: ''
          };
          
          while (parent && depth < 7) {
            const link = parent.closest('a');
            if (link && !productInfo.productUrl) {
              const href = link.getAttribute('href');
              if (href) {
                if (href.startsWith('/')) {
                  productInfo.productUrl = 'https://www.iloom.com' + href;
                } else if (href.startsWith('http')) {
                  productInfo.productUrl = href;
                } else {
                  productInfo.productUrl = 'https://www.iloom.com/' + href;
                }
              }
            }            
            const texts = parent.querySelectorAll('p, span, div');
            texts.forEach((text) => {
              const content = text.textContent?.trim() || '';
              if (content.includes('원') && /[\d,]+/.test(content) && !productInfo.price) {
                productInfo.price = content;
              }
            });
            
            parent = parent.parentElement;
            depth++;
          }
          
          if (productInfo.name && productInfo.imageUrl && 
              !productList.some(p => p.imageUrl === productInfo.imageUrl)) {
            productList.push(productInfo);
          }
        }
      });
      
      return productList;
    });

    console.log(`[${categoryName}] ${products.length}개 제품 발견`);

    const cleanedProducts = products.map((product) => {
      const priceText = product.price || '가격 정보 없음';
      const priceNumber = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
      
      return {        name: product.name,
        imageUrl: product.imageUrl,
        price: priceNumber,
        priceText: priceText,
        category: categoryName,
        brand: '일룸',
        productUrl: product.productUrl || `https://www.iloom.com/product/list.do?categoryNo=${categoryNo}`
      };
    });

    if (cleanedProducts.length > 0) {
      const { data, error } = await supabase
        .from('products')
        .upsert(cleanedProducts, {
          onConflict: 'imageUrl',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`[${categoryName}] Supabase 저장 오류:`, error);
      } else {
        console.log(`[${categoryName}] Supabase 저장 완료`);
      }
    }

    await browser.close();
    return cleanedProducts;

  } catch (error) {
    await browser.close();
    console.error(`[${categoryName}] 크롤링 오류:`, error);
    return [];
  }
}

async function main() {
  const categories = [
    { name: '침실', no: '1' },
    { name: '거실', no: '2' },
    { name: '주방', no: '3' },
    { name: '서재', no: '4' },
    { name: '아이방', no: '5' }
  ];

  console.log('일룸 전체 카테고리 크롤링 시작...');
  
  let totalProducts = 0;
  
  for (const category of categories) {
    const products = await scrapeCategory(category.name, category.no);
    totalProducts += products.length;
    console.log(`[${category.name}] 완료: ${products.length}개`);
    
    // 다음 카테고리 크롤링 전 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n크롤링 완료! 총 ${totalProducts}개 제품 수집`);
}

// 스크립트 실행
main().catch(console.error);