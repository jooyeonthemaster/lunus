/* Alloso (alloso.co.kr) product list crawler
   - Categories via ?categoryNo=
   - Paginate up to 5 pages by appending &page=
   - Extract: title, price (selling_price), productUrl, imageUrl
*/

try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

let categories = [];
if (process.env.ALLOSO_CATEGORIES) {
  try {
    const parsed = JSON.parse(process.env.ALLOSO_CATEGORIES);
    if (Array.isArray(parsed)) categories = parsed.filter(c => c && c.key && c.url);
  } catch (e) { console.error('Failed to parse ALLOSO_CATEGORIES:', e.message); }
}
if (categories.length === 0) {
  categories = [
    { key: '소파', url: 'https://www.alloso.co.kr/product/list?categoryNo=1' },
    { key: '의자', url: 'https://www.alloso.co.kr/product/list?categoryNo=84' },
    { key: '테이블', url: 'https://www.alloso.co.kr/product/list?categoryNo=2' },
    { key: '스토리지', url: 'https://www.alloso.co.kr/product/list?categoryNo=3' },
  ];
}

function absoluteUrl(u, base) { try { return new URL(u, base).toString(); } catch { return null; } }
function parsePriceFromText(txt) {
  if (!txt) return null;
  const m = txt.match(/\d{1,3}(?:[\.,]\d{3})+|\d{4,9}/g);
  if (!m) return null;
  const nums = m.map(x => parseInt(x.replace(/[^0-9]/g, ''), 10)).filter(n => n >= 1000 && n <= 100000000);
  return nums.length ? Math.min(...nums) : null;
}

async function collect(page, out, seen, perCategoryLimit) {
  const base = page.url();
  const items = await page.$$eval('ul.product_list > li.goods_item a.link_goods', (nodes) => {
    const results = [];
    for (const a of nodes) {
      const href = a.getAttribute('href') || '';
      const root = a.closest('li.goods_item') || a;
      const titleEl = root.querySelector('.goods_info .tit');
      const priceEl = root.querySelector('.goods_price .selling_price');
      const imageEl = root.querySelector('.goods_thumb img');
      const title = (titleEl?.textContent || '').trim();
      const priceText = (priceEl?.textContent || '').trim();
      const imgSrc = imageEl?.getAttribute('src') || '';
      if (!href || !title) continue;
      results.push({ href, title, priceText, imgSrc });
    }
    return results;
  });

  let added = 0;
  for (const it of items) {
    const detail = absoluteUrl(it.href, base);
    if (!detail || seen.has(detail)) continue;
    seen.add(detail);
    const image = it.imgSrc ? absoluteUrl(it.imgSrc, base) : null;
    const price = parsePriceFromText(it.priceText);
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
    const delimiter = cat.url.includes('?') ? '&' : '?';
    const url = `${cat.url}${delimiter}page=${pg}`;
    for (let i = 0; i < 3; i++) {
      try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }); break; }
      catch (e) { if (i === 2) throw e; await page.waitForTimeout(1200 * (i + 1)); }
    }
    await page.waitForTimeout(600);
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

  const maxPages = parseInt(process.env.ALLOSO_MAX_PAGES || '5', 10);
  const perCategoryLimit = parseInt(process.env.ALLOSO_PER_CATEGORY_LIMIT || '600', 10);

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const cat of categories) {
    console.log(`[cat] ${cat.key} start`);
    const items = await crawlCategory(context, cat, maxPages, perCategoryLimit);
    const outPath = path.join(outDir, `alloso-${cat.key}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`[cat] ${cat.key} done: ${items.length} -> ${outPath}`);
  }

  await context.close();
  await browser.close();
  console.log('Saved per-category Alloso files under data/');
})();



