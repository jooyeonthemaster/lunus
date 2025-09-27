/* Dongsuh Furniture (dongsuhfurniture.co.kr) product list crawler
   - Categories via ?cateCd=
   - Paginate with &page= (stop when no growth)
   - Extract: title, discounted price, productUrl, imageUrl
*/

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

let categories = [];
if (process.env.DONGSUH_CATEGORIES) {
  try {
    const parsed = JSON.parse(process.env.DONGSUH_CATEGORIES);
    if (Array.isArray(parsed)) categories = parsed.filter(c => c && c.key && c.url);
  } catch (e) { console.error('Failed to parse DONGSUH_CATEGORIES:', e.message); }
}
if (categories.length === 0) {
  categories = [
    { key: '침대', url: 'https://www.dongsuhfurniture.co.kr/goods/goods_list.php?cateCd=044' },
    { key: '흙,황토,돌침대', url: 'https://www.dongsuhfurniture.co.kr/goods/goods_list.php?cateCd=042' },
    { key: '매트리스,토퍼', url: 'https://www.dongsuhfurniture.co.kr/goods/goods_list.php?cateCd=029' },
    { key: '소파', url: 'https://www.dongsuhfurniture.co.kr/goods/goods_list.php?cateCd=047' },
    { key: '옷장,드레스룸', url: 'https://www.dongsuhfurniture.co.kr/goods/goods_list.php?cateCd=030' },
    { key: '수납장,서랍장', url: 'https://www.dongsuhfurniture.co.kr/goods/goods_list.php?cateCd=048' },
    { key: '식탁', url: 'https://www.dongsuhfurniture.co.kr/goods/goods_list.php?cateCd=049' },
    { key: '책상', url: 'https://www.dongsuhfurniture.co.kr/goods/goods_list.php?cateCd=050' },
    { key: '의자', url: 'https://www.dongsuhfurniture.co.kr/goods/goods_list.php?cateCd=051' },
    { key: '책장,장식장,선반', url: 'https://www.dongsuhfurniture.co.kr/goods/goods_list.php?cateCd=052' },
    { key: '거실장,테이블', url: 'https://www.dongsuhfurniture.co.kr/goods/goods_list.php?cateCd=053' },
    { key: '화장대,거울', url: 'https://www.dongsuhfurniture.co.kr/goods/goods_list.php?cateCd=046' },
    { key: '유아,아동가구', url: 'https://www.dongsuhfurniture.co.kr/goods/goods_list.php?cateCd=054' },
  ];
}

function absoluteUrl(u, base) { try { return new URL(u, base).toString(); } catch { return null; } }
function parsePrice(txt) {
  if (!txt) return null;
  const nums = (txt.match(/\d{1,3}(?:[\.,]\d{3})+|\d{4,9}/g) || [])
    .map(x => parseInt(x.replace(/[^0-9]/g, ''), 10))
    .filter(n => n >= 1000 && n <= 100000000);
  return nums.length ? Math.min(...nums) : null;
}

async function collect(page, out, seen, perCategoryLimit) {
  const base = page.url();
  // Only real product cards
  const items = await page.$$eval('.item_cont', (cards) => {
    const results = [];
    for (const card of cards) {
      const a = card.querySelector('a[href*="goods_view.php?goodsNo="]');
      if (!a) continue;
      const href = a.getAttribute('href') || '';
      const titleEl = card.querySelector('.item_info_cont .item_tit_box .item_name');
      let title = (titleEl?.textContent || '').trim();
      title = title.replace(/[\t\n\r]+/g, ' ').replace(/\s{2,}/g, ' ').replace(/\d+%|\d{1,3}(?:,\d{3})*\s*원/g, '').trim();

      // Prefer discounted price, else normal price
      let priceText = '';
      const saleEl = card.querySelector('.item_money_box .time_sale_cost');
      if (saleEl) {
        priceText = (saleEl.textContent || '').trim();
      } else {
        const normalEl = card.querySelector('.item_money_box .item_price strong, .item_money_box .item_price b, .item_money_box strong');
        priceText = (normalEl?.textContent || '').trim();
      }

      // Image: prefer main data attr, then img data-original/src
      const photo = card.querySelector('.item_photo_box');
      let img = photo?.getAttribute('data-image-main') || '';
      if (!img) {
        const im = card.querySelector('img[data-original], img[src]');
        img = im?.getAttribute('data-original') || im?.getAttribute('src') || '';
      }
      if (!href || !title) continue;
      results.push({ href, title, priceText, img });
    }
    return results;
  });

  let added = 0;
  for (const it of items) {
    const detail = absoluteUrl(it.href, base);
    if (!detail || seen.has(detail)) continue;
    seen.add(detail);
    const image = it.img ? absoluteUrl(it.img, base) : null;
    const price = parsePrice(it.priceText);
    out.push({ title: it.title || null, price: price ?? null, productUrl: detail, imageUrl: image });
    added++;
    if (out.length >= perCategoryLimit) break;
  }
  return added;
}

async function crawlCategory(context, cat, maxPages = 5, perCategoryLimit = 600) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
  const out = [];
  const seen = new Set();

  for (let pg = 1; pg <= maxPages && out.length < perCategoryLimit; pg++) {
    const url = cat.url.includes('page=') ? cat.url : `${cat.url}${cat.url.includes('?') ? '&' : '?'}page=${pg}`;
    for (let i = 0; i < 3; i++) {
      try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); break; }
      catch (e) { if (i === 2) throw e; await page.waitForTimeout(1200 * (i + 1)); }
    }
    await page.waitForTimeout(800);
    const added = await collect(page, out, seen, perCategoryLimit);
    console.log(`[cat=${cat.key}] page=${pg} (+${added}) total=${out.length}`);
    if (added === 0 && pg > 1) break;
  }

  await page.close();
  return out;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ko-KR', viewport: { width: 1366, height: 768 }, timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' },
  });

  const maxPages = parseInt(process.env.DONGSUH_MAX_PAGES || '5', 10);
  const perCategoryLimit = parseInt(process.env.DONGSUH_PER_CATEGORY_LIMIT || '600', 10);

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const cat of categories) {
    console.log(`[cat] ${cat.key} start`);
    const items = await crawlCategory(context, cat, maxPages, perCategoryLimit);
    const safeKey = String(cat.key).replace(/[\\\/]/g, ',');
    const outPath = path.join(outDir, `dongsuh-${safeKey}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`[cat] ${cat.key} done: ${items.length} -> ${outPath}`);
  }

  await context.close();
  await browser.close();
  console.log('Saved per-category Dongsuh files under data/');
})();


