/*
  Playwright crawler for VillaRecord with page parameter
  - Iterates through pagination
  - XHR-first with DOM fallback
  - Schema: { title, price, productUrl, imageUrl }
*/

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Categories: prefer env-provided JSON; fallback to defaults
let categories = [];
if (process.env.VILLARECORD_CATEGORIES) {
  try {
    const parsed = JSON.parse(process.env.VILLARECORD_CATEGORIES);
    if (Array.isArray(parsed)) categories = parsed.filter(c => c && c.key && c.url);
  } catch (e) {
    console.error('Failed to parse VILLARECORD_CATEGORIES JSON:', e.message);
  }
}
if (categories.length === 0) {
  categories = [
    { key: '전체', url: 'https://villarecord.com/all-products' },
  ];
}

const MAX_PAGES = Number(process.env.VILLARECORD_MAX_PAGES || 10);
const PER_CATEGORY_LIMIT = Number(process.env.VILLARECORD_PER_CATEGORY_LIMIT || 600);

function absoluteUrl(urlLike, base) { 
  try { return new URL(urlLike, base).toString(); } 
  catch { return null; } 
}

function parsePrice(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : null;
}

// Extract from XHR JSON responses
function extractFromXHR(json, baseUrl) {
  const items = [];
  
  // Try common API response patterns
  const listCandidates = [
    json?.items,
    json?.products,
    json?.data?.items,
    json?.data?.products,
    json?.data?.list,
    json?.result?.items,
    json?.result?.products,
    json?.list,
    json?.goods,
  ].filter(arr => Array.isArray(arr));
  
  const list = listCandidates[0] || [];
  
  for (const item of list) {
    const title = String(
      item.title || 
      item.name || 
      item.productName || 
      item.goodsNm || 
      item.itemName || 
      ''
    ).trim();
    
    // Collect price candidates and find minimum (sale price)
    const priceCandidates = [
      item.salePrice,
      item.discountPrice, 
      item.finalPrice,
      item.sellPrice,
      item.minPrice,
      item.lowPrice,
      item.price,
      item.displayPrice,
    ]
      .map(v => parsePrice(v))
      .filter(v => v && v > 0);
    
    const price = priceCandidates.length > 0 ? Math.min(...priceCandidates) : null;
    
    // Product URL
    const link = item.url || item.link || item.productUrl || item.href;
    const productUrl = link ? absoluteUrl(link, baseUrl) : null;
    
    // Image URL
    const img = item.imageUrl || item.image || item.thumbnail || item.thumbnailUrl || item.img;
    const imageUrl = img ? absoluteUrl(img, baseUrl) : null;
    
    if (title && productUrl) {
      items.push({ title, price, productUrl, imageUrl });
    }
  }
  
  return items;
}

// Extract from DOM - simplified version
async function extractFromDom(page, baseUrl) {
  console.log('[DOM] Starting DOM extraction...');
  
  // Wait for page to stabilize
  await page.waitForTimeout(3000);
  
  const items = await page.evaluate(() => {
    const results = [];
    const seen = new Set();
    
    // Get all links
    const allLinks = document.querySelectorAll('a[href]');
    console.log(`[DOM] Found ${allLinks.length} total links`);
    
    for (const link of allLinks) {
      const href = link.getAttribute('href');
      if (!href || href === '#' || href === '/') continue;
      
      // Skip navigation/utility links
      const skipPatterns = [
        'all-products', 'category', 'collection', 'cart', 'account',
        'login', 'signup', 'about', 'contact', 'terms', 'privacy',
        'search', 'wishlist', 'checkout', 'faq', 'policy'
      ];
      
      if (skipPatterns.some(pattern => href.includes(pattern))) continue;
      
      // Look for product URLs (usually have slugs with hyphens)
      const isProductUrl = 
        (href.includes('-') && !href.includes('?') && !href.includes('#')) ||
        /\/[a-z0-9-]+$/i.test(href);
      
      if (!isProductUrl || seen.has(href)) continue;
      seen.add(href);
      
      // Get parent container for context
      const container = link.closest('article, li, div[class*="product"], div[class*="item"]') || link.parentElement;
      
      // Extract title
      let title = '';
      // Try various title patterns
      const titleElements = container.querySelectorAll('h1, h2, h3, h4, h5, [class*="title"], [class*="name"]');
      for (const el of titleElements) {
        const text = (el.textContent || '').trim();
        if (text && text.length > 2) {
          title = text;
          break;
        }
      }
      
      // Fallback to link text or image alt
      if (!title) {
        title = (link.textContent || '').trim();
        if (!title || title.length < 3) {
          const img = link.querySelector('img[alt]') || container.querySelector('img[alt]');
          if (img) title = img.getAttribute('alt') || '';
        }
      }
      
      // Extract price
      let price = null;
      const priceTexts = [];
      // Look for price elements
      const priceElements = container.querySelectorAll('[class*="price"], [class*="cost"], span, div');
      for (const el of priceElements) {
        const text = (el.textContent || '');
        if (/[\d,]+원|₩[\d,]+|\$[\d,]+/.test(text)) {
          priceTexts.push(text);
        }
      }
      
      // Parse prices and find minimum
      const prices = [];
      for (const text of priceTexts) {
        const matches = text.match(/[\d,]+/g);
        if (matches) {
          for (const match of matches) {
            const num = parseInt(match.replace(/[^0-9]/g, ''), 10);
            if (num >= 1000 && num <= 100000000) {
              prices.push(num);
            }
          }
        }
      }
      
      if (prices.length > 0) {
        price = Math.min(...prices);
      }
      
      // Extract image
      let imgSrc = '';
      const img = link.querySelector('img') || container.querySelector('img');
      if (img) {
        imgSrc = img.getAttribute('data-src') || 
                 img.getAttribute('data-original') || 
                 img.getAttribute('src') || '';
      }
      
      // Only add if we have meaningful data
      if (title || price) {
        results.push({
          href,
          title: title || null,
          price: price || null,
          imgSrc
        });
      }
    }
    
    console.log(`[DOM] Extracted ${results.length} potential products`);
    return results;
  });
  
  const output = [];
  for (const item of items) {
    const productUrl = absoluteUrl(item.href, baseUrl);
    const imageUrl = item.imgSrc ? absoluteUrl(item.imgSrc, baseUrl) : null;
    
    if (productUrl) {
      output.push({
        title: item.title,
        price: item.price,
        productUrl,
        imageUrl
      });
    }
  }
  
  console.log(`[DOM] Returning ${output.length} products`);
  return output;
}

async function crawlCategory(context, category) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
  
  // Enable console logs from page
  page.on('console', msg => {
    if (msg.text().includes('[DOM]')) {
      console.log(msg.text());
    }
  });
  
  // Stealth setup
  await page.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
      Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      window.chrome = { runtime: {}, csi: () => {}, loadTimes: () => {} };
    } catch {}
  });
  
  // Block heavy resources
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'font' || type === 'media') return route.abort();
    return route.continue();
  });
  
  const allItems = [];
  const seen = new Set();
  
  // XHR listener
  let xhrItems = [];
  page.on('response', async (res) => {
    const ct = res.headers()['content-type'] || '';
    if (!ct.includes('application/json')) return;
    
    try {
      const url = res.url();
      if (!/product|item|goods|api|data/.test(url)) return;
      
      const json = await res.json();
      const items = extractFromXHR(json, category.url);
      if (items.length > 0) {
        console.log(`[XHR] Found ${items.length} items from API`);
        xhrItems.push(...items);
      }
    } catch {}
  });
  
  // Crawl pages
  for (let pageNo = 1; pageNo <= MAX_PAGES && allItems.length < PER_CATEGORY_LIMIT; pageNo++) {
    const url = pageNo === 1 
      ? category.url 
      : `${category.url}${category.url.includes('?') ? '&' : '?'}page=${pageNo}`;
    
    console.log(`[Page ${pageNo}] Loading: ${url}`);
    
    // Clear XHR items for this page
    xhrItems = [];
    
    // Navigate with retries
    let success = false;
    for (let retry = 0; retry < 3; retry++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        success = true;
        break;
      } catch (e) {
        console.error(`[Retry ${retry + 1}] goto failed: ${e.message}`);
        await page.waitForTimeout(1500 * (retry + 1));
      }
    }
    
    if (!success) break;
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Try XHR items first
    let pageItems = [...xhrItems];
    
    // If no XHR items, try DOM extraction
    if (pageItems.length === 0) {
      console.log('[Page] No XHR items, trying DOM extraction...');
      const domItems = await extractFromDom(page, url);
      pageItems = domItems;
    }
    
    // Add unique items
    let added = 0;
    for (const item of pageItems) {
      const key = item.productUrl || `${item.title}:${item.price}`;
      if (!seen.has(key) && allItems.length < PER_CATEGORY_LIMIT) {
        seen.add(key);
        allItems.push(item);
        added++;
      }
    }
    
    console.log(`[cat=${category.key}] page=${pageNo} collected=${allItems.length} (+${added})`);
    
    // Stop if no new items found
    if (added === 0) {
      console.log(`[cat=${category.key}] No new items on page ${pageNo}, stopping`);
      break;
    }
  }
  
  await page.close();
  return allItems;
}

(async () => {
  const browser = await chromium.launch({ 
    headless: false, // Set to false for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] 
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1366, height: 768 },
    timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' },
    ignoreHTTPSErrors: true,
  });
  
  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  for (const cat of categories) {
    console.log(`[cat] ${cat.key} start`);
    const items = await crawlCategory(context, cat);
    
    const fileName = `villarecord-${cat.key.replace(/\s+/g, '-')}.json`;
    const outPath = path.join(outDir, fileName);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    
    console.log(`[cat] ${cat.key} done: ${items.length} -> ${outPath}`);
  }
  
  await context.close();
  await browser.close();
  
  console.log('Saved per-category VillaRecord files under data/');
})().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});